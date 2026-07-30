# ZKTeco K40 → Portal bridge

Runs on the Raspberry Pi. It is the only process that talks to both the K40 on the
LAN and Supabase over the WAN.

The bridge makes **no attendance decisions**. It relays punches durably; all policy
(late/on-time, holidays, leave, out-of-office pairing) lives in the
`attendance-biometric-punch` edge function.

## How it fits together

```
K40 (UDP 4370, LAN)          Raspberry Pi 3B+                   Supabase
─────────────────────        ────────────────────────           ─────────────────────
fingerprint punch      →     poll every 30s                →    attendance-biometric-punch
enroll numbers only         spool to SQLite (durable)            ├─ dedupe on punch_uid
device RTC             ←     Pi pushes NTP time                  ├─ resolve zk_user_id → member
attendance log         ←     cleared only after ack              ├─ recompute the day
                             heartbeat every 60s                 └─ biometric_punches + attendance
```

Fingerprint templates never leave the device. Only enroll numbers and timestamps
are transmitted.

## Why polling, not `live_capture()`

pyzk can stream punches, but on a K40 over UDP the stream drops often and silently
— and a dropped stream is indistinguishable from "nobody punched". A poll loop over
a durable spool cannot silently stop working, and it recovers from a Pi reboot or a
network outage with no special handling.

## Durability model

Every punch exists in two places until the server confirms it:

1. the device's own attendance log (cleared only once nothing is unacked, and only
   near capacity — `ZK_CLEAR_DEVICE_LOGS` is off by default)
2. the Pi's SQLite spool (`acked = 0` until a 200 comes back)

`punch_uid = sha256(terminal|enroll_number|timestamp)` is the server's idempotency
key, so re-sending after an ambiguous failure is always a no-op. Delivery only has
to be at-least-once, which the Pi can actually guarantee.

## Install on the Pi

```bash
sudo adduser --system --group zkbridge
sudo mkdir -p /opt/linknbit-zk /var/lib/linknbit-zk
sudo chown zkbridge:zkbridge /var/lib/linknbit-zk

# copy this directory's *.py, requirements.txt and the unit file
sudo cp *.py requirements.txt /opt/linknbit-zk/
sudo python3 -m venv /opt/linknbit-zk/venv
sudo /opt/linknbit-zk/venv/bin/pip install -r /opt/linknbit-zk/requirements.txt
sudo cp linknbit-zk.service /etc/systemd/system/
```

Create `/etc/linknbit-zk.env` (mode `0600`, owner `zkbridge`):

```ini
ZK_DEVICE_IP=192.168.18.91
ZK_DEVICE_PORT=4370
ZK_DEVICE_PASSWORD=0            # set this to the device comm key once configured
ZK_TERMINAL_NAME=K40 — Main Office
ZK_TERMINAL_SECRET=<from the portal, or zk_provision.py --new-secret>
ZK_INGEST_URL=https://<project-ref>.supabase.co/functions/v1/attendance-biometric-punch
ZK_TIMEZONE=Asia/Karachi
ZK_POLL_INTERVAL_SEC=30
# systemd runs with ProtectSystem=strict, so /opt is read-only — the spool must
# live under the unit's ReadWritePaths.
ZK_SPOOL_PATH=/var/lib/linknbit-zk/spool.sqlite3
```

Then:

```bash
sudo systemctl enable --now linknbit-zk
journalctl -u linknbit-zk -f
```

Prefer **ethernet**. The 3B+'s onboard WiFi is the least reliable link in this chain.

## First-run checklist

```bash
# 1. device reachable, clock skew, enrolled users
python zk_provision.py --roster

# 2. correct the device RTC (drift moves the late/on-time boundary)
python zk_provision.py --sync-time

# 3. one real cycle, verbose
python zk_bridge.py --once --verbose
```

Then link enroll numbers to members in the portal: **Attendance → Terminals**.

## Local development without hardware

`--fake-device` substitutes an in-memory terminal, so the spool, dedupe, batching,
retry and reconciliation paths can all be exercised off-LAN:

```bash
python zk_bridge.py --once --fake-device --dry-run   # read + spool, never POST
python zk_bridge.py --once --fake-device            # full path incl. upload
```

The fake device emits a realistic day: one member with a long lunch (producing one
excluded gap) and one with only an arrival and a departure.

## Device configuration that cannot be automated

pyzk cannot set the comm key remotely. On the keypad:

```
Menu → Comm → Security → COMM Key
```

Until that is set the device accepts unauthenticated connections, meaning anyone on
the office WiFi can dump the enrolled user list over UDP 4370. Also give the
terminal a static DHCP lease and allow UDP 4370 to it **only** from the Pi.

Never call `clear_data()` on the device — it wipes enrolled fingerprints. The bridge
only ever calls `clear_attendance()`.

## Failure modes

| Symptom | What happens | What to do |
|---|---|---|
| Pi loses WAN | punches keep spooling, nothing acked | self-heals; watch `unacked` in the logs |
| Pi is down | terminal keeps logging locally | portal check-in re-opens automatically once the heartbeat goes stale (10 min) |
| Device clock drifts | punches land at the wrong time | `--sync-time`; the bridge also re-syncs every cycle and warns above 60s skew |
| Enroll number not linked | punch stored, no attendance | `unmatched_user` + a warning in the audit log; link it in the portal |
| Member punches once only | check-in but no check-out | existing auto-checkout settings apply |
| Odd number of mid-day punches | unpaired punch is not deducted | `warning` audit flag for a human to correct |

## Privacy

Member names travel to the server on roster sync (the linking UI needs them) but are
never written to the Pi's logs or spool — the SD card holds enroll numbers only.

## Files

| File | Role |
|---|---|
| `zk_bridge.py` | entrypoint and poll loop |
| `zk_client.py` | pyzk wrapper + `FakeZKDevice`; the one place device time is converted to UTC |
| `spool.py` | SQLite spool, dedupe and cursor |
| `uploader.py` | HTTP client for all three Pi→server messages |
| `config.py` | environment loading and validation |
| `zk_provision.py` | setup/diagnostics; `--new-secret` mints a terminal secret |
| `linknbit-zk.service` | systemd unit |
| `test_zk.py` | original bare connectivity probe |
