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

## Office IP auto-update

WiFi check-in compares the phone's IP against `attendance_settings.office_ip_cidr`.
That address is an ISP lease: it changes whenever the router reboots, and until
someone retypes the CIDR every on-site check-in is rejected as `wrong_network`.

The heartbeat fixes this for free. The Pi POSTs from inside the office every 60s,
so **the source address of that request is the office's public IP** — observed
through the same proxy that stamps `X-Forwarded-For` on an employee's check-in.
No third-party lookup is involved in the decision, and the value is measured by
the same mechanism it will later be compared against. `fn_terminal_sync_office_ip`
does the rest.

Deliberate properties:

- **Your prefix is kept.** A `/24` stays a `/24`; only the network part moves. A
  bare address (an implicit `/32`) stays exact.
- **It only fires when the gate would have broken.** If the observed IP is still
  inside the configured range, nothing is written.
- **It never turns enforcement on.** A blank CIDR stays blank; the settings page
  shows the observed IP with a "Use this IP" button for the initial setup.
- **The Pi cross-checks itself.** `public_ip.py` resolves the Pi's public IP from
  two independent providers that must agree (see that file for why the failure
  modes are asymmetric). If that disagrees with the address the server sees, the
  Pi is reaching Supabase over some other path — a VPN, a tethered backup link —
  and the update is refused with a flagged audit entry instead of locking the
  office out. Set `ZK_PUBLIC_IP_CHECK=false` to skip the cross-check.
- **It survives the outage that causes it.** A router reboot changes the IP and
  kills the WAN at the same moment, so the heartbeat runs on its own clock rather
  than on the poll cycle: it still goes out when the device is unreachable and
  when the poll loop has backed off to 5-minute retries.
- **Changes are auditable.** Every rewrite files
  `attendance.office_ip_auto_updated`; a cross-check failure files
  `attendance.office_ip_mismatch`. The routine "nothing changed" case writes
  nothing at all.

> **Run the bridge only from inside the office.** Anything holding the terminal
> secret can move the office IP range, so a copy left running on a laptop at home
> will point WiFi check-in at that home connection. Toggle
> **Attendance → Settings → Auto-Update from Terminal** off while testing off-site.

## Install on the Pi — automated

Once SSH is enabled on the Pi (Raspberry Pi OS ships with it **off**: either
`sudo raspi-config` → Interface Options → SSH on the Pi itself, or put an empty file
named `ssh` in the boot partition of its SD card and reboot):

```bash
./deploy_to_pi.sh pi@192.168.18.43
```

That copies the code, creates the `zkbridge` service account, builds the venv,
writes `/etc/linknbit-zk.env` (0600, secret read from your local `.env` and never
echoed), runs a connectivity check to the terminal **as the service user**, then
enables and starts the service. Idempotent — re-run it after editing any `.py` file.

It asks for the Pi user's **sudo** password **once, ever**, then remembers it in
the macOS Keychain (`linknbit-zk-sudo`, account = the ssh target). Every password
is verified against the Pi before being stored, and a saved one that stops
working is forgotten and re-asked rather than failing forever. To forget it:

```bash
security delete-generic-password -s linknbit-zk-sudo -a ghayas@192.168.18.43
```

The install runs over a piped heredoc, so sudo has no terminal to prompt on — the
password is handed to it via a 0700 `SUDO_ASKPASS` helper deleted on every exit
path. `sudo -S` would be simpler but reads from stdin, colliding with the
`sudo tee <<EOF` that writes the env file.

**The comm key is settled by probing the terminal, not by trusting `.env`.** The
key is set on the K40's keypad and cannot be read back over the wire, so
`/etc/linknbit-zk.env` is its only record — and a deploy from a laptop whose
`.env` still held the factory `0` used to overwrite it silently. Nothing looked
wrong, because the running process keeps the working value in memory: the bridge
would only die at the next reboot, hours later. The deploy now tries your `.env`
key against the device first, falls back to the key already on the Pi if that is
the one the terminal accepts, and keeps the Pi's copy when the terminal cannot be
reached at all (a powered-off terminal is no reason to destroy the record).

The manual equivalent is below, if you'd rather do it by hand.

## Install on the Pi — manual

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
# Cross-check for the office-IP auto-update (see below). false = skip it.
ZK_PUBLIC_IP_CHECK=true
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

Note that the second form sends a real heartbeat, which is what carries the office
IP — off-site, prefer `--dry-run` (which skips the heartbeat entirely) or turn
Auto-Update off in the portal first. See the office-IP section above.

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
| Router reboot changes the office IP | the first heartbeat after the WAN returns moves `office_ip_cidr` | nothing; check the audit log for `office_ip_auto_updated` |
| Bridge run from off-site | office IP would follow that connection | keep it in the office, or turn off Auto-Update in Attendance settings |
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
| `public_ip.py` | the Pi's own public-IP lookup, used only to cross-check the office-IP update |
| `zk_provision.py` | setup/diagnostics; `--new-secret` mints a terminal secret |
| `linknbit-zk.service` | systemd unit |
| `test_zk.py` | original bare connectivity probe |
