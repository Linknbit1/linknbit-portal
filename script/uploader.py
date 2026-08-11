"""HTTP client for the attendance-biometric-punch edge function.

All three Pi→server messages (punches, heartbeat, roster) share one place so the
auth headers, timeouts and retry policy can't drift apart between them.

Uses urllib from the standard library rather than requests, to keep the Pi's
dependency set to pyzk alone.
"""

from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.request

from spool import Punch
from zk_client import DeviceInfo, RosterUser

log = logging.getLogger("zk.upload")

# A 4xx means the request itself is wrong (bad secret, unknown terminal); retrying
# it unchanged will never help, so only network errors, 5xx and 429 are retried.
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class IngestError(Exception):
    """Raised when a message could not be delivered after all retries."""


class Ingest:
    def __init__(self, url: str, terminal_name: str, terminal_secret: str,
                 timeout: int = 20, max_attempts: int = 4) -> None:
        self._url = url
        self._terminal_name = terminal_name
        # Only the secret travels as a header. Python encodes headers as latin-1,
        # so a terminal name containing any non-latin-1 character (an em dash in
        # "K40 — Main Office" is enough) would make every request fail; the name
        # goes in the JSON body, which is UTF-8.
        self._headers = {
            "Content-Type": "application/json",
            "x-terminal-secret": terminal_secret,
        }
        self._timeout = timeout
        self._max_attempts = max_attempts

    def _post(self, payload: dict) -> dict:
        body = json.dumps({"terminal": self._terminal_name, **payload}).encode("utf-8")
        delay = 2.0
        last_error: str = "unknown error"

        for attempt in range(1, self._max_attempts + 1):
            req = urllib.request.Request(self._url, data=body, headers=self._headers, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                    return json.loads(resp.read().decode("utf-8") or "{}")
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", "replace")[:200]
                last_error = f"HTTP {exc.code}: {detail}"
                if exc.code not in RETRYABLE_STATUS:
                    raise IngestError(last_error) from exc
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                last_error = f"network error: {exc}"

            if attempt < self._max_attempts:
                log.warning("upload attempt %d/%d failed (%s); retrying in %.0fs",
                            attempt, self._max_attempts, last_error, delay)
                time.sleep(delay)
                delay *= 2

        raise IngestError(last_error)

    def send_punches(self, punches: list[Punch]) -> dict:
        """Deliver a batch. A 200 means every punch in it is durably stored."""
        return self._post({
            "action": "punches",
            "punches": [p.to_payload() for p in punches],
        })

    def send_heartbeat(
        self,
        info: DeviceInfo | None,
        device_ip: str,
        last_poll_at: str | None,
        public_ip: str | None = None,
    ) -> dict:
        """Report terminal health, and let the server refresh the office IP.

        `info` is None when the device could not be read this cycle. The
        heartbeat still goes out: it is what keeps terminal-gated portal
        check-in open, and the request's own source address is how the server
        keeps the office IP current — both matter most precisely when the
        hardware is unreachable. Health fields are then omitted rather than
        nulled, so the server keeps the last known good values.

        `public_ip` is the Pi's independent view of its own public address, sent
        only as a cross-check (see public_ip.py); the server treats a
        disagreement as a reason NOT to touch the office IP.
        """
        payload: dict = {
            "action": "heartbeat",
            "device_ip": device_ip,
            "last_poll_at": last_poll_at,
        }
        if info is not None:
            payload.update({
                "firmware": info.firmware,
                "serial_number": info.serial_number,
                "device_log_count": info.log_count,
                "clock_skew_sec": info.clock_skew_sec,
            })
        if public_ip:
            payload["public_ip"] = public_ip
        return self._post(payload)

    def send_roster(self, users: list[RosterUser]) -> dict:
        """Push enrolled users so admins can link enroll numbers by name.

        Names travel to the server (the linking UI needs them) but are never
        written to the Pi's own logs or spool.
        """
        return self._post({
            "action": "roster",
            "users": [
                {"zk_user_id": u.zk_user_id, "name": u.name, "privilege": u.privilege}
                for u in users
            ],
        })
