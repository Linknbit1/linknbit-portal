#!/usr/bin/env python3
"""One-off setup and diagnostics for the K40, run from the Pi.

The terminal is a closed appliance — there is no code to deploy onto it. This
script does the parts that can be done over the network, and prints instructions
for the parts that can only be done on the device keypad.

Usage:
    python zk_provision.py                # report device state
    python zk_provision.py --sync-time    # also push the Pi clock to the device
    python zk_provision.py --roster       # also list enrolled users
    python zk_provision.py --new-secret   # mint a terminal secret + its hash
"""

from __future__ import annotations

import argparse
import hashlib
import secrets
import sys

import config
from zk_client import ZKDevice

COMM_KEY_STEPS = """
Set a comm key on the device (it currently accepts unauthenticated connections):

    Menu → Comm → Security → COMM Key → set a number → save

pyzk cannot set this remotely, so it must be done on the keypad. Afterwards put
the same number in ZK_DEVICE_PASSWORD on the Pi.

Also, at the router:
  • give the terminal a static DHCP lease
  • allow UDP 4370 to it only from the Pi's address

Without a comm key, anyone on the office WiFi can read the enrolled user list
over UDP 4370.
"""


def mint_secret() -> int:
    secret = secrets.token_hex(32)
    digest = hashlib.sha256(secret.encode()).hexdigest()
    print("Terminal secret (put in ZK_TERMINAL_SECRET on the Pi, store nowhere else):")
    print(f"  {secret}\n")
    print("SHA-256 hash (this is what goes in biometric_terminals.secret_hash):")
    print(f"  {digest}\n")
    print("The portal's Attendance → Terminals screen does both sides for you;")
    print("use this only when bootstrapping by hand.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="K40 provisioning and diagnostics")
    parser.add_argument("--sync-time", action="store_true", help="push the Pi clock to the device")
    parser.add_argument("--roster", action="store_true", help="list enrolled users")
    parser.add_argument("--new-secret", action="store_true",
                        help="generate a terminal secret and its hash, then exit")
    args = parser.parse_args()

    if args.new_secret:
        return mint_secret()

    cfg = config.load()
    print(f"Connecting to {cfg.device_ip}:{cfg.device_port} (timeout {cfg.device_timeout}s) ...")

    try:
        with ZKDevice(cfg.device_ip, cfg.device_port, cfg.device_password,
                      cfg.device_timeout, cfg.timezone) as dev:
            info = dev.info()
            print("\n── Device ──────────────────────────────────────────")
            print(f"  firmware       : {info.firmware}")
            print(f"  serial number  : {info.serial_number}")
            print(f"  enrolled users : {info.user_count}")
            print(f"  attendance log : {info.log_count} records")

            if info.clock_skew_sec is None:
                print("  clock skew     : unknown")
            else:
                print(f"  clock skew     : {info.clock_skew_sec:+d}s vs the Pi")
                if abs(info.clock_skew_sec) > 60:
                    print("    ⚠ over a minute out — this shifts the late/on-time boundary.")
                    print("      Re-run with --sync-time.")

            if args.sync_time:
                dev.sync_time()
                print("\n  clock synced from the Pi.")

            if args.roster:
                users = dev.roster()
                print(f"\n── Enrolled users ({len(users)}) ─────────────────────")
                for u in users:
                    print(f"  {u.zk_user_id:>6}  {u.name or '(no name on device)'}")
                print("\nLink these enroll numbers to members in the portal:")
                print("  Attendance → Terminals → Link enrolled users")

    except Exception as exc:  # noqa: BLE001 - this is a diagnostic tool
        print(f"\nFAILED: {exc}", file=sys.stderr)
        print("\nChecks: is the Pi on the same LAN? is ZK_DEVICE_IP right?", file=sys.stderr)
        print("Does ZK_DEVICE_PASSWORD match the device comm key?", file=sys.stderr)
        return 1

    if cfg.device_password == 0:
        print(COMM_KEY_STEPS)

    return 0


if __name__ == "__main__":
    sys.exit(main())
