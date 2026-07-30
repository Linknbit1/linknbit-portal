"""Thin wrapper over pyzk for the K40.

Why polling rather than pyzk's live_capture(): on a K40 over UDP the live stream
drops frequently and silently, and a dropped stream looks identical to "nobody has
punched". A poll loop with a durable spool cannot silently stop working, and it
recovers from a Pi reboot or a network outage with no special handling.

force_udp / ommit_ping match the settings proven against this device in test_zk.py.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from types import TracebackType
from zoneinfo import ZoneInfo

log = logging.getLogger("zk.client")


@dataclass(frozen=True)
class DeviceInfo:
    firmware: str | None
    serial_number: str | None
    log_count: int | None
    user_count: int | None
    clock_skew_sec: int | None


@dataclass(frozen=True)
class RawPunch:
    zk_user_id: str
    punched_at_utc: str


@dataclass(frozen=True)
class RosterUser:
    zk_user_id: str
    name: str
    privilege: int


def _to_utc_iso(naive_local: datetime, tz_name: str) -> str:
    """The device reports naive wall-clock time in its own timezone.

    Attach the configured zone and normalise to UTC so the server never has to
    guess. Getting this wrong shifts every punch by hours and silently corrupts
    late/on-time classification, so it is done in exactly one place.
    """
    if naive_local.tzinfo is not None:
        return naive_local.astimezone(timezone.utc).isoformat()
    return naive_local.replace(tzinfo=ZoneInfo(tz_name)).astimezone(timezone.utc).isoformat()


class ZKDevice:
    """Connection-scoped device handle. Use as a context manager."""

    def __init__(self, ip: str, port: int, password: int, timeout: int, tz_name: str) -> None:
        self.ip = ip
        self.port = port
        self.password = password
        self.timeout = timeout
        self.tz_name = tz_name
        self._conn = None

    def __enter__(self) -> "ZKDevice":
        from zk import ZK  # imported lazily so --fake-device works without pyzk

        zk = ZK(
            self.ip,
            port=self.port,
            timeout=self.timeout,
            password=self.password,
            force_udp=True,
            ommit_ping=True,
        )
        self._conn = zk.connect()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        if self._conn is not None:
            try:
                self._conn.disconnect()
            except Exception:  # noqa: BLE001 - never mask the original error
                log.warning("disconnect failed; connection dropped")
            self._conn = None

    # ── Reads ─────────────────────────────────────────────────────────────────

    def info(self) -> DeviceInfo:
        conn = self._require()
        firmware = serial = None
        log_count = user_count = None
        skew = None

        try:
            firmware = conn.get_firmware_version()
        except Exception:  # noqa: BLE001
            log.warning("could not read firmware version")
        try:
            serial = conn.get_serialnumber()
        except Exception:  # noqa: BLE001
            log.warning("could not read serial number")
        try:
            log_count = len(conn.get_attendance())
        except Exception:  # noqa: BLE001
            log.warning("could not read attendance log count")
        try:
            user_count = len(conn.get_users())
        except Exception:  # noqa: BLE001
            log.warning("could not read user count")

        try:
            device_now = conn.get_time()
            if device_now is not None:
                device_utc = datetime.fromisoformat(_to_utc_iso(device_now, self.tz_name))
                skew = int((device_utc - datetime.now(timezone.utc)).total_seconds())
        except Exception:  # noqa: BLE001
            log.warning("could not read device clock")

        return DeviceInfo(firmware, serial, log_count, user_count, skew)

    def punches(self) -> list[RawPunch]:
        conn = self._require()
        out: list[RawPunch] = []
        for rec in conn.get_attendance():
            ts = getattr(rec, "timestamp", None)
            uid = getattr(rec, "user_id", None)
            if ts is None or uid is None:
                continue
            out.append(RawPunch(str(uid), _to_utc_iso(ts, self.tz_name)))
        # The device does not guarantee ordering; downstream pairing depends on it.
        out.sort(key=lambda p: p.punched_at_utc)
        return out

    def roster(self) -> list[RosterUser]:
        conn = self._require()
        users: list[RosterUser] = []
        for u in conn.get_users():
            uid = getattr(u, "user_id", None)
            if uid is None:
                continue
            users.append(
                RosterUser(
                    zk_user_id=str(uid),
                    name=str(getattr(u, "name", "") or ""),
                    privilege=int(getattr(u, "privilege", 0) or 0),
                )
            )
        return users

    # ── Writes ────────────────────────────────────────────────────────────────

    def sync_time(self) -> None:
        """Push the Pi's (NTP-backed) clock to the device.

        The K40 keeps its own RTC and drifts. Drift feeds straight into the
        late/on-time boundary, so it is corrected on every cycle rather than
        being merely reported.
        """
        conn = self._require()
        conn.set_time(datetime.now())

    def clear_punches(self) -> None:
        """Clear the device's attendance log ONLY.

        Never call clear_data() — that also wipes enrolled fingerprints, which
        cannot be recovered without re-enrolling every member.
        """
        conn = self._require()
        conn.clear_attendance()

    def _require(self):  # noqa: ANN202 - pyzk has no exported connection type
        if self._conn is None:
            raise RuntimeError("ZKDevice used outside its context manager")
        return self._conn


class FakeZKDevice:
    """In-memory stand-in used by --fake-device.

    Exists so the spool, dedupe, batching, retry and pairing logic can be
    exercised end-to-end without the terminal on the LAN.
    """

    def __init__(self, tz_name: str, punches: list[RawPunch] | None = None) -> None:
        self.tz_name = tz_name
        self._punches = punches if punches is not None else self._sample()
        self.cleared = False
        self.time_synced = False

    @staticmethod
    def _sample() -> list[RawPunch]:
        today = datetime.now(ZoneInfo("Asia/Karachi")).date()

        def at(hour: int, minute: int) -> str:
            local = datetime(today.year, today.month, today.day, hour, minute,
                             tzinfo=ZoneInfo("Asia/Karachi"))
            return local.astimezone(timezone.utc).isoformat()

        # Enroll 12: arrive, long lunch out/in, leave → one excluded gap.
        # Enroll 13: arrive and leave only.
        return [
            RawPunch("12", at(8, 55)),
            RawPunch("12", at(13, 5)),
            RawPunch("12", at(14, 0)),
            RawPunch("12", at(18, 2)),
            RawPunch("13", at(9, 20)),
            RawPunch("13", at(17, 45)),
        ]

    def __enter__(self) -> "FakeZKDevice":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        return None

    def info(self) -> DeviceInfo:
        return DeviceInfo("FAKE 1.0", "FAKE-SERIAL", len(self._punches), 2, 0)

    def punches(self) -> list[RawPunch]:
        return sorted(self._punches, key=lambda p: p.punched_at_utc)

    def roster(self) -> list[RosterUser]:
        return [RosterUser("12", "Ahmad Karimi", 0), RosterUser("13", "Sara Qureshi", 0)]

    def sync_time(self) -> None:
        self.time_synced = True

    def clear_punches(self) -> None:
        self.cleared = True
        self._punches = []
