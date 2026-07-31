#!/usr/bin/env python3
"""Linknbit ZKTeco → portal bridge.

Runs on the Raspberry Pi as the only process that talks to both the K40 on the
LAN and Supabase over the WAN. It makes no attendance decisions — it relays
punches durably and lets the edge function apply policy.

Cycle:
    connect → push Pi clock to device → read attendance log → spool it
    → flush unacked batches to the server → optionally clear the device log

Usage:
    python zk_bridge.py                 # run forever (what systemd runs)
    python zk_bridge.py --once          # single cycle, then exit
    python zk_bridge.py --dry-run       # read and spool, never POST
    python zk_bridge.py --fake-device   # no hardware; exercises the full pipeline
"""

from __future__ import annotations

import argparse
import logging
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Callable

import config
from spool import Punch, Spool, punch_uid
from uploader import Ingest, IngestError
from zk_client import FakeZKDevice, ZKDevice

log = logging.getLogger("zk.bridge")

_shutdown = False


def _request_shutdown(signum: int, _frame: object) -> None:
    global _shutdown
    _shutdown = True
    log.info("signal %d received; finishing current cycle then exiting", signum)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def collect(cfg: config.Config, spool: Spool, device_factory: Callable[[], object]) -> dict:
    """One device read: sync clock, pull the log into the spool, report health."""
    with device_factory() as dev:  # type: ignore[attr-defined]
        try:
            dev.sync_time()
        except Exception as exc:  # noqa: BLE001 - clock sync must never abort a poll
            log.warning("device clock sync failed: %s", exc)

        info = dev.info()
        punches = dev.punches()

        new_count = 0
        for raw in punches:
            uid = punch_uid(cfg.terminal_name, raw.zk_user_id, raw.punched_at_utc)
            if spool.add(Punch(uid, raw.zk_user_id, raw.punched_at_utc)):
                new_count += 1

        # Clearing is deliberately conservative: only when the server has
        # everything and the device is near capacity. Until then the device log is
        # a free second copy.
        cleared = False
        if (
            cfg.clear_device_logs
            and spool.unacked_count() == 0
            and (info.log_count or 0) >= cfg.clear_threshold
        ):
            dev.clear_punches()
            cleared = True
            log.info("device log cleared (%s records, all acked)", info.log_count)

    if info.clock_skew_sec is not None and abs(info.clock_skew_sec) > 60:
        log.warning(
            "device clock was off by %ds before sync — late/on-time results for "
            "punches since the last poll may be wrong",
            info.clock_skew_sec,
        )

    log.info(
        "read %d records (%d new); spool: %d unacked / %d total%s",
        len(punches), new_count, spool.unacked_count(), spool.total_count(),
        "; device log cleared" if cleared else "",
    )
    return {"info": info, "read": len(punches), "new": new_count}


def flush(cfg: config.Config, spool: Spool, ingest: Ingest, dry_run: bool) -> int:
    """Send unacked punches in batches. Returns how many were acked."""
    sent = 0
    while not _shutdown:
        batch = spool.unacked(cfg.batch_size)
        if not batch:
            break
        if dry_run:
            log.info("[dry-run] would upload %d punches", len(batch))
            break

        resp = ingest.send_punches(batch)
        spool.ack([p.punch_uid for p in batch])
        sent += len(batch)
        log.info(
            "uploaded %d punches (accepted=%s reconciled=%s unmatched=%s)",
            len(batch), resp.get("accepted"), resp.get("reconciled"),
            resp.get("unmatched") or [],
        )
        if len(batch) < cfg.batch_size:
            break
    return sent


def run(cfg: config.Config, *, once: bool, dry_run: bool, fake: bool) -> int:
    spool = Spool(cfg.spool_path)
    ingest = Ingest(cfg.ingest_url, cfg.terminal_name, cfg.terminal_secret)

    def device_factory() -> object:
        if fake:
            return FakeZKDevice(cfg.timezone)
        return ZKDevice(cfg.device_ip, cfg.device_port, cfg.device_password,
                        cfg.device_timeout, cfg.timezone)

    last_heartbeat = 0.0
    last_roster = 0.0
    failures = 0

    try:
        while True:
            cycle_started = time.monotonic()
            try:
                result = collect(cfg, spool, device_factory)
                spool.set_meta("last_poll_at", _now_iso())
                flush(cfg, spool, ingest, dry_run)
                failures = 0

                if not dry_run and cycle_started - last_heartbeat >= cfg.heartbeat_interval_sec:
                    ingest.send_heartbeat(
                        result["info"], cfg.device_ip, spool.get_meta("last_poll_at")
                    )
                    last_heartbeat = cycle_started

                if not dry_run and cycle_started - last_roster >= cfg.roster_interval_sec:
                    with device_factory() as dev:  # type: ignore[attr-defined]
                        users = dev.roster()
                    ingest.send_roster(users)
                    last_roster = cycle_started
                    log.info("roster synced (%d enrolled users)", len(users))

            except IngestError as exc:
                failures += 1
                # Nothing is acked on failure, so the punches stay queued and the
                # device still holds its copy. Safe to simply try again.
                log.error("upload failed (%d consecutive): %s", failures, exc)
            except Exception as exc:  # noqa: BLE001 - the service must not die
                failures += 1
                log.error("cycle failed (%d consecutive): %s", failures, exc)

            if once or _shutdown:
                break

            # Back off after repeated failures so a dead device or dead WAN isn't
            # hammered every 30s, but never wait more than ~5 minutes.
            interval = cfg.poll_interval_sec
            if failures:
                interval = min(cfg.poll_interval_sec * (2 ** min(failures, 4)), 300)

            elapsed = time.monotonic() - cycle_started
            for _ in range(int(max(0.0, interval - elapsed))):
                if _shutdown:
                    break
                time.sleep(1)

        spool.prune_acked()
        return 0 if failures == 0 else 1
    finally:
        spool.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Linknbit ZKTeco → portal bridge")
    parser.add_argument("--once", action="store_true", help="run a single cycle and exit")
    parser.add_argument("--dry-run", action="store_true",
                        help="read and spool punches but never upload")
    parser.add_argument("--fake-device", action="store_true",
                        help="use an in-memory device instead of real hardware")
    parser.add_argument("--verbose", action="store_true", help="debug logging")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s  %(message)s",
    )

    signal.signal(signal.SIGTERM, _request_shutdown)
    signal.signal(signal.SIGINT, _request_shutdown)

    cfg = config.load()
    log.info(
        "starting: terminal=%r device=%s:%d tz=%s spool=%s%s",
        cfg.terminal_name, cfg.device_ip, cfg.device_port, cfg.timezone, cfg.spool_path,
        " [FAKE DEVICE]" if args.fake_device else "",
    )
    return run(cfg, once=args.once, dry_run=args.dry_run, fake=args.fake_device)


if __name__ == "__main__":
    sys.exit(main())
