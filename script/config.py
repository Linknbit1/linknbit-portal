"""Configuration for the ZKTeco bridge.

Everything is environment-driven so the terminal secret never lives in the repo.
On the Pi these come from /etc/linknbit-zk.env (loaded by the systemd unit); for
local runs a .env file next to this script is read as a fallback.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ENV_FILE = Path(__file__).with_name(".env")


def _load_env_file() -> None:
    """Minimal .env reader — avoids a python-dotenv dependency on the Pi.

    Existing environment variables always win, so systemd's EnvironmentFile
    cannot be silently overridden by a stale local .env.
    """
    if not ENV_FILE.exists():
        return
    for raw in ENV_FILE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip().strip('"').strip("'")


@dataclass(frozen=True)
class Config:
    device_ip: str
    device_port: int
    device_password: int
    device_timeout: int
    terminal_name: str
    terminal_secret: str
    ingest_url: str
    poll_interval_sec: int
    heartbeat_interval_sec: int
    roster_interval_sec: int
    batch_size: int
    spool_path: Path
    timezone: str
    # Device logs are only cleared once the spool holds nothing unacked, and only
    # when the device is close to full. Off by default: the device's own copy is
    # the last line of defence if the Pi's SD card dies.
    clear_device_logs: bool
    clear_threshold: int


def _int_env(key: str, default: int) -> int:
    raw = os.environ.get(key)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise SystemExit(f"{key} must be an integer, got {raw!r}") from exc


def load() -> Config:
    _load_env_file()

    missing = [
        key
        for key in ("ZK_DEVICE_IP", "ZK_TERMINAL_NAME", "ZK_TERMINAL_SECRET", "ZK_INGEST_URL")
        if not os.environ.get(key)
    ]
    if missing:
        raise SystemExit(
            "Missing required environment variables: "
            + ", ".join(missing)
            + f"\nSet them in {ENV_FILE} or /etc/linknbit-zk.env (see script/README.md)."
        )

    spool = os.environ.get("ZK_SPOOL_PATH") or str(Path(__file__).with_name("spool.sqlite3"))

    return Config(
        device_ip=os.environ["ZK_DEVICE_IP"],
        device_port=_int_env("ZK_DEVICE_PORT", 4370),
        device_password=_int_env("ZK_DEVICE_PASSWORD", 0),
        device_timeout=_int_env("ZK_DEVICE_TIMEOUT", 10),
        terminal_name=os.environ["ZK_TERMINAL_NAME"],
        terminal_secret=os.environ["ZK_TERMINAL_SECRET"],
        ingest_url=os.environ["ZK_INGEST_URL"].rstrip("/"),
        poll_interval_sec=_int_env("ZK_POLL_INTERVAL_SEC", 30),
        heartbeat_interval_sec=_int_env("ZK_HEARTBEAT_INTERVAL_SEC", 60),
        roster_interval_sec=_int_env("ZK_ROSTER_INTERVAL_SEC", 900),
        batch_size=_int_env("ZK_BATCH_SIZE", 200),
        spool_path=Path(spool),
        timezone=os.environ.get("ZK_TIMEZONE", "Asia/Karachi"),
        clear_device_logs=os.environ.get("ZK_CLEAR_DEVICE_LOGS", "false").lower() == "true",
        clear_threshold=_int_env("ZK_CLEAR_THRESHOLD", 80000),
    )
