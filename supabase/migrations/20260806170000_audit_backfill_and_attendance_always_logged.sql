-- Follow-up to 20260806160000 (biometric attribution fix).
--
-- PART 1 — Backfill the historical mislabels.
--   Past K40 punches were logged as "<HR person> edited attendance for <employee>"
--   at severity 'warning'. Discriminator between a punch and a genuine human edit
--   of a biometric row: the edge function does NOT touch updated_at, while every
--   frontend write stamps it (verified against attendance 927f33c6 on 2026-08-06,
--   where the 10:59 punch left updated_at unchanged and the 15:26 human edit did
--   not). Also require device_name, which only a device write sets.
--
-- PART 2 — Attendance is never exempt from auditing.
--   Investigating that same row turned up a write at 11:26:47 local that set
--   status='wfh' and cleared a device-verified check_in, leaving NO audit row at
--   all. The only code path that produces total silence is the super_admin
--   exemption, and there is exactly one super_admin. Attendance drives payroll,
--   so it now gets a trail regardless of who performs the write. The exemption
--   still applies to every other table.

-- ── PART 1 ────────────────────────────────────────────────────────────────────
UPDATE audit_log
   SET actor_id   = subject_id,
       actor_name = subject_name,
       actor_role = COALESCE((SELECT role FROM profiles WHERE id = audit_log.subject_id), actor_role),
       actor_kind = 'self',
       action     = CASE WHEN 'check_in' = ANY(changed_fields)
                         THEN 'attendance.check_in' ELSE 'attendance.self_update' END,
       severity   = 'info',
       flagged    = false,
       flag_reason= NULL,
       summary    = COALESCE(subject_name,'A member')
                    || CASE WHEN 'check_in' = ANY(changed_fields)
                            THEN ' checked in' ELSE ' updated their attendance' END
 WHERE table_name = 'attendance'
   AND action IN ('attendance.edited','attendance.marked_on_behalf')
   AND actor_kind = 'user'
   AND new_values->>'source' = 'biometric'
   AND new_values->>'device_name' IS NOT NULL
   AND subject_id IS NOT NULL
   AND NOT ('updated_at' = ANY(changed_fields));

-- ── PART 2 ────────────────────────────────────────────────────────────────────
-- Patch the guard in place rather than re-emitting the whole 400-line function,
-- so this migration cannot accidentally revert unrelated logic. Hard-fails if the
-- anchor is absent, so it can never silently no-op.
DO $patch$
DECLARE
  v_def     text;
  v_anchor  text := 'AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = v_auth AND p.role = ''super_admin'') THEN';
  v_replace text := 'AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = v_auth AND p.role = ''super_admin'')'
                 || E'\n     AND TG_TABLE_NAME <> ''attendance'' THEN';
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_audit_capture';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'fn_audit_capture not found';
  END IF;

  IF position(v_anchor in v_def) = 0 THEN
    RAISE EXCEPTION 'super_admin exemption anchor not found in fn_audit_capture — migration 20260806160000 must be applied first';
  END IF;

  EXECUTE replace(v_def, v_anchor, v_replace);
END
$patch$;
