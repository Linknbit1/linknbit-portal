#!/usr/bin/env bash
# One-shot deploy of the ZKTeco bridge to the Raspberry Pi.
#
# Run from this directory on a machine that can SSH to the Pi:
#   ./deploy_to_pi.sh pi@192.168.18.43
#
# Idempotent — safe to re-run after editing the Python files. It copies the code,
# builds the venv, installs the systemd unit and starts the service.
#
# The terminal secret is read from ./.env and written to /etc/linknbit-zk.env with
# mode 0600, owned by the service user. It is never echoed to the terminal.

set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "usage: $0 <user>@<pi-host>    e.g. $0 pi@192.168.18.43" >&2
  exit 2
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

if [[ ! -f .env ]]; then
  echo "ERROR: no .env in $HERE — cannot determine the terminal secret." >&2
  exit 1
fi

# Read config from the local .env, then override the spool path: /opt is read-only
# under the unit's ProtectSystem=strict, so the spool must live in /var/lib.
get() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }

DEVICE_IP="$(get ZK_DEVICE_IP)"
DEVICE_PORT="$(get ZK_DEVICE_PORT)"
DEVICE_PASSWORD="$(get ZK_DEVICE_PASSWORD)"
TERMINAL_NAME="$(get ZK_TERMINAL_NAME)"
TERMINAL_SECRET="$(get ZK_TERMINAL_SECRET)"
INGEST_URL="$(get ZK_INGEST_URL)"
TIMEZONE="$(get ZK_TIMEZONE)"

for v in DEVICE_IP TERMINAL_NAME TERMINAL_SECRET INGEST_URL; do
  if [[ -z "${!v}" ]]; then echo "ERROR: $v missing from .env" >&2; exit 1; fi
done

echo "▸ Deploying to $TARGET"
echo "  terminal : $TERMINAL_NAME"
echo "  device   : $DEVICE_IP:${DEVICE_PORT:-4370}"
echo

echo "▸ Copying source"
ssh "$TARGET" 'mkdir -p ~/linknbit-zk-staging'
scp -q config.py spool.py uploader.py zk_client.py zk_bridge.py zk_provision.py \
       requirements.txt linknbit-zk.service "$TARGET:~/linknbit-zk-staging/"

echo "▸ Installing (sudo on the Pi)"
# Config travels base64-encoded: SSH flattens command args into one string, so a
# value containing a space (e.g. the terminal name "K40 Main Office") would be
# re-split by the remote shell. base64 is space-free and quoting-safe; the remote
# side decodes into the 0600 env file. The secret never lands in shell history.
b64() { printf '%s' "$1" | base64 | tr -d '\n'; }

ssh "$TARGET" \
  "B_IP='$(b64 "$DEVICE_IP")'" \
  "B_PORT='$(b64 "${DEVICE_PORT:-4370}")'" \
  "B_PW='$(b64 "${DEVICE_PASSWORD:-0}")'" \
  "B_NAME='$(b64 "$TERMINAL_NAME")'" \
  "B_SECRET='$(b64 "$TERMINAL_SECRET")'" \
  "B_URL='$(b64 "$INGEST_URL")'" \
  "B_TZ='$(b64 "${TIMEZONE:-Asia/Karachi}")'" \
  'bash -s' <<'REMOTE'
set -euo pipefail

d() { base64 -d <<<"$1"; }
ZK_DEVICE_IP="$(d "$B_IP")"
ZK_DEVICE_PORT="$(d "$B_PORT")"
ZK_DEVICE_PASSWORD="$(d "$B_PW")"
ZK_TERMINAL_NAME="$(d "$B_NAME")"
ZK_TERMINAL_SECRET="$(d "$B_SECRET")"
ZK_INGEST_URL="$(d "$B_URL")"
ZK_TIMEZONE="$(d "$B_TZ")"

sudo apt-get update -qq
sudo apt-get install -y -qq python3-venv python3-pip

# Dedicated unprivileged service account (no login shell): the bridge holds a
# secret that can write attendance for any member.
if ! id zkbridge >/dev/null 2>&1; then
  sudo adduser --system --group --no-create-home zkbridge
fi

sudo mkdir -p /opt/linknbit-zk /var/lib/linknbit-zk
sudo cp ~/linknbit-zk-staging/*.py ~/linknbit-zk-staging/requirements.txt /opt/linknbit-zk/
sudo cp ~/linknbit-zk-staging/linknbit-zk.service /etc/systemd/system/

if [[ ! -x /opt/linknbit-zk/venv/bin/python ]]; then
  sudo python3 -m venv /opt/linknbit-zk/venv
fi
sudo /opt/linknbit-zk/venv/bin/pip install -q --upgrade pip
sudo /opt/linknbit-zk/venv/bin/pip install -q -r /opt/linknbit-zk/requirements.txt

# Spool lives here because ProtectSystem=strict makes /opt read-only.
# Values are double-quoted so a space (the terminal name) survives both systemd's
# EnvironmentFile reader — which strips the quotes — and a bash `source` of the
# same file in the connectivity check below.
sudo tee /etc/linknbit-zk.env >/dev/null <<EOF
ZK_DEVICE_IP="${ZK_DEVICE_IP}"
ZK_DEVICE_PORT="${ZK_DEVICE_PORT}"
ZK_DEVICE_PASSWORD="${ZK_DEVICE_PASSWORD}"
ZK_TERMINAL_NAME="${ZK_TERMINAL_NAME}"
ZK_TERMINAL_SECRET="${ZK_TERMINAL_SECRET}"
ZK_INGEST_URL="${ZK_INGEST_URL}"
ZK_TIMEZONE="${ZK_TIMEZONE}"
ZK_POLL_INTERVAL_SEC="30"
ZK_SPOOL_PATH="/var/lib/linknbit-zk/spool.sqlite3"
ZK_CLEAR_DEVICE_LOGS="false"
EOF

sudo chown zkbridge:zkbridge /etc/linknbit-zk.env /var/lib/linknbit-zk
sudo chmod 600 /etc/linknbit-zk.env

rm -rf ~/linknbit-zk-staging

echo "▸ Connectivity check from the Pi to the terminal"
# Runs as the service user so a permission problem shows up now, not at 9am.
# `set -a; source` loads the env file safely — parsing it with xargs would
# re-split any value that contains a space (again, the terminal name).
sudo -u zkbridge bash -c '
  set -a
  . /etc/linknbit-zk.env
  set +a
  exec /opt/linknbit-zk/venv/bin/python /opt/linknbit-zk/zk_provision.py
' || {
    echo "!! The Pi could not reach the terminal. Check both are on the same LAN." >&2
    exit 1
  }

sudo systemctl daemon-reload
sudo systemctl enable --now linknbit-zk
sleep 5
sudo systemctl --no-pager --lines=15 status linknbit-zk || true
REMOTE

echo
echo "▸ Done. The bridge now starts on boot and restarts after a crash."
echo "  logs:    ssh $TARGET 'journalctl -u linknbit-zk -f'"
echo "  restart: ssh $TARGET 'sudo systemctl restart linknbit-zk'"
echo
echo "Stop the copy running on this Mac once the Pi is reporting — two relays"
echo "for one terminal is harmless (punch_uid dedupes) but confusing to debug."
