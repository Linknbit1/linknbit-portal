-- attendance.system_marked was logging automated writes under a human's name.
--
-- 13 such rows existed, all false, in two shapes:
--   (a) 5 echoes of a leave/WFH approval already logged one second earlier as
--       leave.approved / leave.entered_on_behalf — pure duplicates.
--   (b) 8 genuine cron writes (auto-checkout at 23:59, absence/leave sync at
--       08:16-08:31) that nobody performed.
-- Both named a person (Mahnoor Irshad, Saif Ullah, Zain Malik) because the actor
-- fell back to the row's persistent marked_by. attendance's ONLY *_by column is
-- marked_by, so once any human touched a row every later automated write to it
-- was attributed to them.
--
-- Migration 20260731170000 already decided these must not be logged ("purely
-- automated: cron auto-checkout, absence job"). That rule is
--   IF v_actor IS NULL AND v_actor_kind <> 'self' THEN RETURN NULL
-- which never fired here, because stale marked_by kept v_actor non-null. Clearing
-- v_actor for source='system' makes the existing rule work as intended.
--
-- These rows also had no fn_audit_describe case, so they rendered via the generic
-- fallback ("X changed attendance for Y") — reading like a manual edit. Moot once
-- they are no longer written.
--
-- NOT changed here: the same stale-*_by risk structurally exists on other
-- service-role-written tables (enrolled_devices.approved_by, quest_tasks.created_by,
-- reward_redemptions.reviewed_by). No false rows were proven there, and the general
-- fix (ignore *_by columns that did not change in an UPDATE) trades false
-- attribution for missing rows, so it is left as a separate decision.

DO $patch$
DECLARE
  v_def     text;
  v_anchor  text := E'ELSIF (v_row->>''source'') = ''system'' THEN\n      v_actor_kind := ''system'';';
  v_replace text := E'ELSIF (v_row->>''source'') = ''system'' THEN\n'
                 || E'      -- Automated write (approval sync, auto-checkout cron, absence job).\n'
                 || E'      -- marked_by is stale human state, not the performer: drop it so the\n'
                 || E'      -- "system actions are not logged" rule below actually fires.\n'
                 || E'      v_actor := NULL;\n'
                 || E'      v_actor_kind := ''system'';';
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_audit_capture';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'fn_audit_capture not found';
  END IF;
  IF position(v_anchor in v_def) = 0 THEN
    RAISE EXCEPTION 'source=system branch anchor not found in fn_audit_capture';
  END IF;

  EXECUTE replace(v_def, v_anchor, v_replace);
END
$patch$;

-- Purge the 13 false rows. Precedent: 20260731170000 purged ~69 system-noise rows
-- from this same table for the same reason.
DELETE FROM audit_log WHERE action = 'attendance.system_marked';
