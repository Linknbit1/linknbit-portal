#!/usr/bin/env bash
#
# RLS regression test.
#
#   ./scripts/rls-test.sh --capture   record the current state as the golden baseline
#   ./scripts/rls-test.sh             compare current state against the baseline
#
# Connection: same as scripts/db-backup.sh
#   PGPASSWORD='...' ./scripts/rls-test.sh
#
# The SQL runs inside BEGIN/ROLLBACK and creates only pg_temp objects, so this
# is safe against production and cannot modify data.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL="$REPO_ROOT/supabase/tests/rls/snapshot.sql"
GOLDEN="$REPO_ROOT/supabase/tests/rls/golden.tsv"

PROJECT_REF="${PROJECT_REF:-pifsboyhheazpccyliwy}"

if [[ -z "${PGPASSWORD:-}" && -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: set PGPASSWORD (or SUPABASE_DB_URL)." >&2
  exit 1
fi

if [[ -z "${PSQL:-}" && -x /usr/local/opt/libpq/bin/psql ]]; then
  PSQL=/usr/local/opt/libpq/bin/psql
fi
PSQL="${PSQL:-$(command -v psql)}"

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  CONN=("$SUPABASE_DB_URL")
else
  export PGPASSWORD
  CONN=(
    --host="${PGHOST:-db.$PROJECT_REF.supabase.co}"
    --port="${PGPORT:-5432}"
    --username="${PGUSER:-postgres}"
    --dbname="${PGDATABASE:-postgres}"
    --no-password
  )
fi

ACTUAL="$(mktemp -t rls-actual)"
trap 'rm -f "$ACTUAL"' EXIT

"$PSQL" "${CONN[@]}" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$SQL" \
  | grep -v '^$' > "$ACTUAL"

LINES=$(wc -l < "$ACTUAL" | tr -d ' ')
if [[ "$LINES" -lt 100 ]]; then
  echo "ERROR: snapshot produced only $LINES rows - something went wrong." >&2
  head -20 "$ACTUAL" >&2
  exit 1
fi

if [[ "${1:-}" == "--capture" ]]; then
  mkdir -p "$(dirname "$GOLDEN")"
  cp "$ACTUAL" "$GOLDEN"
  echo "Captured baseline: $LINES checks -> $GOLDEN"
  exit 0
fi

if [[ ! -f "$GOLDEN" ]]; then
  echo "ERROR: no baseline at $GOLDEN. Run with --capture first." >&2
  exit 1
fi

if diff -u "$GOLDEN" "$ACTUAL" > /tmp/rls-diff.txt; then
  echo "PASS: $LINES checks, no access changes."
else
  echo "FAIL: access changed vs baseline."
  echo ""
  # Show only the meaningful +/- lines, not the whole context.
  grep -E '^[+-][^+-]' /tmp/rls-diff.txt | head -60
  echo ""
  CHANGED=$(grep -cE '^[+-][^+-]' /tmp/rls-diff.txt)
  echo "($CHANGED changed lines; full diff at /tmp/rls-diff.txt)"
  exit 1
fi
