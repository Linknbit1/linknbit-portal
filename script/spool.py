"""Durable local punch spool.

The Pi must never lose a punch to a WAN outage, so every punch read off the
device is written here first and only removed from the "unacked" set once the
server has confirmed it. Combined with leaving the device's own log intact, every
punch exists in two places until it is safely stored server-side.

Dedupe is by punch_uid (a hash of terminal + enroll number + timestamp), which is
also the server's idempotency key — so a resend after an ambiguous failure is
always a no-op rather than a duplicate.

Privacy: this file lives on an SD card, so it stores enroll numbers only. Member
names are never written here.
"""

from __future__ import annotations

import hashlib
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS punches (
    punch_uid  TEXT PRIMARY KEY,
    zk_user_id TEXT NOT NULL,
    punched_at TEXT NOT NULL,
    acked      INTEGER NOT NULL DEFAULT 0,
    first_seen TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_punches_unacked ON punches (acked, punched_at);

CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def punch_uid(terminal_name: str, zk_user_id: str, punched_at_iso: str) -> str:
    """Stable idempotency key. Must be computed identically on every retry."""
    raw = f"{terminal_name}|{zk_user_id}|{punched_at_iso}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Punch:
    punch_uid: str
    zk_user_id: str
    punched_at: str

    def to_payload(self) -> dict[str, str]:
        return {
            "punch_uid": self.punch_uid,
            "zk_user_id": self.zk_user_id,
            "punched_at": self.punched_at,
        }


class Spool:
    def __init__(self, path: Path) -> None:
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(str(path))
        self._db.row_factory = sqlite3.Row
        # WAL keeps reads and writes from blocking each other, and survives an
        # abrupt power loss better than the default rollback journal.
        self._db.execute("PRAGMA journal_mode=WAL")
        self._db.executescript(SCHEMA)
        self._db.commit()

    def close(self) -> None:
        self._db.close()

    def add(self, punch: Punch) -> bool:
        """Record a punch. Returns True if it was new to the spool."""
        cur = self._db.execute(
            "INSERT OR IGNORE INTO punches (punch_uid, zk_user_id, punched_at, first_seen) "
            "VALUES (?, ?, ?, ?)",
            (
                punch.punch_uid,
                punch.zk_user_id,
                punch.punched_at,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        self._db.commit()
        return cur.rowcount > 0

    def unacked(self, limit: int) -> list[Punch]:
        rows = self._db.execute(
            "SELECT punch_uid, zk_user_id, punched_at FROM punches "
            "WHERE acked = 0 ORDER BY punched_at LIMIT ?",
            (limit,),
        ).fetchall()
        return [
            Punch(punch_uid=r["punch_uid"], zk_user_id=r["zk_user_id"], punched_at=r["punched_at"])
            for r in rows
        ]

    def ack(self, uids: list[str]) -> None:
        if not uids:
            return
        self._db.executemany(
            "UPDATE punches SET acked = 1 WHERE punch_uid = ?", [(u,) for u in uids]
        )
        self._db.commit()

    def unacked_count(self) -> int:
        row = self._db.execute("SELECT COUNT(*) AS n FROM punches WHERE acked = 0").fetchone()
        return int(row["n"])

    def total_count(self) -> int:
        row = self._db.execute("SELECT COUNT(*) AS n FROM punches").fetchone()
        return int(row["n"])

    def get_meta(self, key: str) -> str | None:
        row = self._db.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else None

    def set_meta(self, key: str, value: str) -> None:
        self._db.execute(
            "INSERT INTO meta (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
        self._db.commit()

    def prune_acked(self, keep: int = 20000) -> int:
        """Trim old acked rows so the SD card doesn't fill over years of use.

        Kept generously: acked history is the only local record of what was sent,
        which is useful when reconciling a disputed day.
        """
        cur = self._db.execute(
            "DELETE FROM punches WHERE acked = 1 AND punch_uid NOT IN ("
            "  SELECT punch_uid FROM punches WHERE acked = 1 ORDER BY punched_at DESC LIMIT ?"
            ")",
            (keep,),
        )
        self._db.commit()
        return cur.rowcount
