#!/usr/bin/env bash
#
# Read-only backup of the live Supabase database.
#
# Usage (preferred - password is passed to libpq directly, so characters like
# @ # ? , need no escaping):
#
#   PGPASSWORD='your-password' PGHOST='db.<ref>.supabase.co' ./scripts/db-backup.sh
#
# PGHOST defaults to the direct-connection host for this project. If that fails
# with "network is unreachable", the host is IPv6-only - use the Session pooler
# host instead (Dashboard -> Project Settings -> Database -> Connection string):
#
#   PGPASSWORD='...' PGHOST='aws-0-<region>.pooler.supabase.com' \
#     PGUSER='postgres.<ref>' ./scripts/db-backup.sh
#
# A full SUPABASE_DB_URL still works if you prefer, but any special characters
# in the password must be percent-encoded (@ -> %40, # -> %23, ? -> %3F).
#
# Backups are written OUTSIDE the repo so real employee data can never be
# committed. Override with BACKUP_ROOT=/some/other/path.
#
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-$HOME/Ghayas/linknbit-db-backups}"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
OUT="$BACKUP_ROOT/$STAMP"

PROJECT_REF="${PROJECT_REF:-pifsboyhheazpccyliwy}"

# Connection is passed as discrete libpq arguments rather than a URI, so the
# password never has to survive URI parsing.
if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  CONN=("$SUPABASE_DB_URL")
elif [[ -n "${PGPASSWORD:-}" ]]; then
  export PGPASSWORD
  CONN=(
    --host="${PGHOST:-db.$PROJECT_REF.supabase.co}"
    --port="${PGPORT:-5432}"
    --username="${PGUSER:-postgres}"
    --dbname="${PGDATABASE:-postgres}"
    --no-password
  )
else
  echo "ERROR: set PGPASSWORD (or SUPABASE_DB_URL). See the header of this script." >&2
  exit 1
fi

# Supabase runs Postgres 17; pg_dump refuses to dump from a newer server.
# Homebrew's libpq ships a 17.x client without disturbing a local postgresql@14.
if [[ -z "${PG_DUMP:-}" && -x /usr/local/opt/libpq/bin/pg_dump ]]; then
  PG_DUMP=/usr/local/opt/libpq/bin/pg_dump
fi
PG_DUMP="${PG_DUMP:-$(command -v pg_dump)}"
DUMP_MAJOR="$("$PG_DUMP" --version | sed -E 's/.* ([0-9]+).*/\1/')"
if (( DUMP_MAJOR < 17 )); then
  echo "ERROR: pg_dump is version $DUMP_MAJOR but the server is 17." >&2
  echo "Install a matching client:  brew install libpq" >&2
  echo "Then re-run with:  PG_DUMP=/usr/local/opt/libpq/bin/pg_dump $0" >&2
  exit 1
fi

mkdir -p "$OUT"
echo "Backing up to $OUT"

# 1. Restorable custom-format dump of the app schema (schema + data).
echo "  [1/4] public schema, custom format (restorable)"
"$PG_DUMP" "${CONN[@]}" \
  --schema=public --format=custom --no-owner --no-privileges \
  --file="$OUT/public_full.dump"

# 2. Plain SQL schema only - easy to read and diff (policies, functions, triggers).
echo "  [2/4] public schema, SQL (schema only)"
"$PG_DUMP" "${CONN[@]}" \
  --schema=public --schema-only --no-owner --no-privileges \
  --file="$OUT/public_schema.sql"

# 3. Plain SQL data only - human-inspectable safety copy.
echo "  [3/4] public schema, SQL (data only)"
"$PG_DUMP" "${CONN[@]}" \
  --schema=public --data-only --no-owner --no-privileges \
  --file="$OUT/public_data.sql"

# 4. Auth users. Owned by supabase_auth_admin, so this may be denied - not fatal.
echo "  [4/4] auth schema (best effort)"
if "$PG_DUMP" "${CONN[@]}" \
     --schema=auth --no-owner --no-privileges \
     --file="$OUT/auth.sql" 2>"$OUT/auth.err"; then
  rm -f "$OUT/auth.err"
else
  echo "        skipped (insufficient privileges) - see auth.err"
fi

{
  echo "Linknbit portal database backup"
  echo "taken:   $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "server:  $("$PG_DUMP" --version)"
  echo ""
  echo "Restore the app schema into a scratch database with:"
  echo "  pg_restore --clean --if-exists --no-owner -d <target-url> public_full.dump"
} > "$OUT/README.txt"

echo ""
ls -lh "$OUT"
echo ""
echo "Done. $OUT"
