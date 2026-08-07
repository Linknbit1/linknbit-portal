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
# Was hardcoded to 30 in the remote block, which silently reverted the Pi to the
# default every deploy. It comes from .env now so a tuned value survives.
POLL_INTERVAL="$(get ZK_POLL_INTERVAL_SEC)"

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
       public_ip.py requirements.txt linknbit-zk.service "$TARGET:~/linknbit-zk-staging/"

# Config travels base64-encoded: SSH flattens command args into one string, so a
# value containing a space (e.g. the terminal name "K40 Main Office") would be
# re-split by the remote shell. base64 is space-free and quoting-safe; the remote
# side decodes into the 0600 env file. The secret never lands in shell history.
b64() { printf '%s' "$1" | base64 | tr -d '\n'; }

# The install runs over a piped heredoc, so sudo has no terminal to prompt on and
# fails with "a terminal is required to read the password". `ssh -t` cannot fix
# it either — the pseudo-terminal and the heredoc both want stdin.
#
# So: ask here, and hand the answer to sudo through SUDO_ASKPASS. Not `sudo -S`,
# which reads the password from stdin and would collide with the `sudo tee <<EOF`
# that writes the env file. Skipped entirely when sudo needs no password (a
# NOPASSWD rule, or a warm sudo timestamp from the user's own session).
#
# The password is remembered in the macOS Keychain (service `linknbit-zk-sudo`,
# account = the ssh target) rather than in this repo or a dotfile: the Keychain
# is encrypted at rest, unlocked with the login password, and `security` will
# not hand the value back to a different binary without asking. Remove it with
#   security delete-generic-password -s linknbit-zk-sudo -a <user>@<host>
KEYCHAIN_SERVICE="linknbit-zk-sudo"
have_keychain() { [[ "$(uname)" == "Darwin" ]] && command -v security >/dev/null; }

# Verifies a candidate password against the Pi. Every password is proven before
# it is stored or used: saving a typo would turn every later run into a
# "rejected" error with no prompt left to correct it.
sudo_works() { printf '%s\n' "$1" | ssh "$TARGET" 'sudo -S -p "" true' 2>/dev/null; }

SUDO_PW=""
if ssh "$TARGET" 'sudo -n true' 2>/dev/null; then
  echo "▸ Installing (passwordless sudo on the Pi)"
else
  if have_keychain; then
    SUDO_PW="$(security find-generic-password -w \
                 -s "$KEYCHAIN_SERVICE" -a "$TARGET" 2>/dev/null || true)"
  fi

  if [[ -n "$SUDO_PW" ]] && sudo_works "$SUDO_PW"; then
    echo "▸ Installing (sudo password from Keychain)"
  else
    if [[ -n "$SUDO_PW" ]]; then
      # Stale entry — the Pi's password changed. Drop it rather than failing on
      # every future run with no way to correct it from here.
      echo "▸ The saved sudo password no longer works; forgetting it."
      security delete-generic-password -s "$KEYCHAIN_SERVICE" -a "$TARGET" >/dev/null 2>&1 || true
      SUDO_PW=""
    fi

    echo "▸ sudo on the Pi needs a password."
    read -rsp "  sudo password for $TARGET: " SUDO_PW
    echo
    if [[ -z "$SUDO_PW" ]]; then
      echo "ERROR: no password entered; nothing was changed on the Pi." >&2
      exit 1
    fi
    if ! sudo_works "$SUDO_PW"; then
      echo "ERROR: the Pi rejected that sudo password. Nothing was changed." >&2
      exit 1
    fi

    if have_keychain; then
      security add-generic-password -U \
        -s "$KEYCHAIN_SERVICE" -a "$TARGET" -w "$SUDO_PW" \
        -j "sudo password for the Linknbit ZKTeco bridge Pi" 2>/dev/null \
        && echo "  saved to your Keychain — future deploys will not ask."
    fi
    echo "▸ Installing (sudo on the Pi)"
  fi
fi

ssh "$TARGET" \
  "B_SUDO='$(b64 "$SUDO_PW")'" \
  "B_IP='$(b64 "$DEVICE_IP")'" \
  "B_PORT='$(b64 "${DEVICE_PORT:-4370}")'" \
  "B_PW='$(b64 "${DEVICE_PASSWORD:-0}")'" \
  "B_NAME='$(b64 "$TERMINAL_NAME")'" \
  "B_SECRET='$(b64 "$TERMINAL_SECRET")'" \
  "B_URL='$(b64 "$INGEST_URL")'" \
  "B_TZ='$(b64 "${TIMEZONE:-Asia/Karachi}")'" \
  "B_POLL='$(b64 "${POLL_INTERVAL:-30}")'" \
  'bash -s' <<'REMOTE'
set -euo pipefail

d() { base64 -d <<<"$1"; }

# Every `sudo` below goes through an askpass helper, so none of them touches
# stdin — which the env-file heredoc and the connectivity check both need. The
# helper is 0600, owned by this user, and removed on ANY exit path including a
# failed `set -e` step; the password is never written to a log or the env file.
SUDO_PASSWORD="$(d "$B_SUDO")"
if [[ -n "$SUDO_PASSWORD" ]]; then
  ASKPASS="$(mktemp)"
  chmod 700 "$ASKPASS"
  trap 'rm -f "$ASKPASS"' EXIT
  # The password reaches the file via stdin, not an argument — an argument would
  # be visible in `ps` to every user on the Pi for as long as the write took.
  printf '%s\n' '#!/bin/sh' 'cat "$0.pw"' > "$ASKPASS"
  (umask 077; printf '%s\n' "$SUDO_PASSWORD" > "$ASKPASS.pw")
  trap 'rm -f "$ASKPASS" "$ASKPASS.pw"' EXIT
  export SUDO_ASKPASS="$ASKPASS"
  sudo() { command sudo -A "$@"; }

  if ! sudo true; then
    echo "!! That sudo password was rejected by the Pi. Nothing was changed." >&2
    exit 1
  fi
fi
unset SUDO_PASSWORD

ZK_DEVICE_IP="$(d "$B_IP")"
ZK_DEVICE_PORT="$(d "$B_PORT")"
ZK_DEVICE_PASSWORD="$(d "$B_PW")"
ZK_TERMINAL_NAME="$(d "$B_NAME")"
ZK_TERMINAL_SECRET="$(d "$B_SECRET")"
ZK_INGEST_URL="$(d "$B_URL")"
ZK_TIMEZONE="$(d "$B_TZ")"
ZK_POLL_INTERVAL_SEC="$(d "$B_POLL")"

# Read the comm key already on the Pi before anything overwrites it. The key is
# set on the K40's KEYPAD and cannot be read back over the wire, so this file is
# its only record — and a deploy from a laptop whose .env still says the factory
# "0" would destroy it silently: the running process keeps the working value in
# memory, so the bridge does not die until the next reboot, hours later.
EXISTING_KEY=""
if sudo test -f /etc/linknbit-zk.env; then
  EXISTING_KEY="$(sudo grep -E '^ZK_DEVICE_PASSWORD=' /etc/linknbit-zk.env \
                  | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi

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

# ── Settle the comm key by ASKING THE DEVICE, not by trusting either file.
# Comparing the two values could only ever say "they differ"; it could not say
# which one the terminal accepts. Probing can, and it is the same check that used
# to run at the end of this script — moved ahead of the write so a stale laptop
# .env is caught BEFORE it destroys the Pi's copy rather than after.
probe_key() {
  ZK_DEVICE_IP="$ZK_DEVICE_IP" ZK_DEVICE_PORT="$ZK_DEVICE_PORT" \
  ZK_DEVICE_PASSWORD="$1" ZK_TERMINAL_NAME=probe ZK_TERMINAL_SECRET=x \
  ZK_INGEST_URL=http://localhost \
  /opt/linknbit-zk/venv/bin/python /opt/linknbit-zk/zk_provision.py >/dev/null 2>&1
}

echo "▸ Checking the device comm key"
if probe_key "$ZK_DEVICE_PASSWORD"; then
  echo "  the key in your .env works"
elif [[ -n "$EXISTING_KEY" ]] && probe_key "$EXISTING_KEY"; then
  echo "!! The comm key in your local .env is NOT the one the terminal accepts;" >&2
  echo "   the key already on the Pi is. Keeping the Pi's — your .env would have" >&2
  echo "   locked the bridge out at its next restart." >&2
  echo "   Fix ZK_DEVICE_PASSWORD in script/.env to stop seeing this." >&2
  ZK_DEVICE_PASSWORD="$EXISTING_KEY"
elif [[ -n "$EXISTING_KEY" ]]; then
  # Neither answered — almost certainly the terminal is off or off-LAN, which is
  # no reason to discard the only record of a key we cannot read back.
  echo "!! The terminal did not answer on either key, so it could not be verified." >&2
  echo "   Keeping the key already on the Pi and continuing with the code update." >&2
  ZK_DEVICE_PASSWORD="$EXISTING_KEY"
else
  echo "!! The terminal did not answer. Continuing with the key from .env." >&2
fi

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
ZK_POLL_INTERVAL_SEC="${ZK_POLL_INTERVAL_SEC}"
ZK_SPOOL_PATH="/var/lib/linknbit-zk/spool.sqlite3"
ZK_CLEAR_DEVICE_LOGS="false"
# Every heartbeat teaches the server the office's current public IP, so a router
# reboot no longer breaks WiFi check-in. This value is the Pi's own cross-check;
# "false" leaves the server relying on its own observation alone.
ZK_PUBLIC_IP_CHECK="true"
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
    # A warning, not an abort. The comm key was already settled by probing above,
    # so a failure here means the terminal went away mid-deploy or zkbridge lacks
    # permission — neither is a reason to leave the Pi running stale code with
    # the service never restarted. The bridge retries the device forever anyway.
    echo "!! The service user could not reach the terminal. Deploying anyway;" >&2
    echo "   check the LAN and 'journalctl -u linknbit-zk -f' afterwards." >&2
  }

sudo systemctl daemon-reload
sudo systemctl enable --now linknbit-zk
sudo systemctl restart linknbit-zk   # `enable --now` is a no-op if already running
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
