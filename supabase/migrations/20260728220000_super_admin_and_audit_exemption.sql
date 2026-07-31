-- 1. Promote ghayasleo99@gmail.com to super_admin.
-- 2. Stop the audit log from recording anything a super_admin does.
--
-- On (2), for whoever reads this later: this is a deliberate accountability
-- trade-off, not an oversight. Actions taken by a super_admin - including
-- salary edits, attendance changes, XP grants and impersonation - leave no
-- trace, and the danger-flag notifications that normally alert admins to
-- self-grants or back-dated check-ins never fire for that account. Other
-- admins cannot tell entries are missing. Reverse by dropping the guard block
-- at the top of fn_audit_capture().

-- ── Promotion ────────────────────────────────────────────────────────────────
-- Additive: the existing admin assignment is left in place. super_admin carries
-- the `administrator` permission, so the union is unchanged either way, and
-- fn_sync_profile_primary_role() moves profiles.role to super_admin because it
-- has the highest position.
insert into profile_roles (profile_id, role_id)
select p.id, r.id
from profiles p
cross join roles r
where p.email = 'ghayasleo99@gmail.com'
  and r.slug = 'super_admin'
on conflict do nothing;

-- ── Audit exemption ──────────────────────────────────────────────────────────
-- fn_audit_capture() is ~250 lines and is patched in place rather than retyped,
-- so no other branch of it can be altered by transcription error. The migration
-- fails loudly if the anchor is not found.
do $$
declare
  v_def    text;
  v_new    text;
  v_anchor constant text := E'BEGIN\n  v_old := CASE';
  v_guard  constant text :=
    E'BEGIN\n'
    '  -- Super admins are exempt from auditing (see migration 20260728220000).\n'
    '  IF auth.uid() IS NOT NULL\n'
    '     AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ''super_admin'') THEN\n'
    '    RETURN NULL;\n'
    '  END IF;\n'
    '\n'
    '  v_old := CASE';
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'fn_audit_capture';

  if v_def is null then
    raise exception 'fn_audit_capture not found';
  end if;

  if position(v_anchor in v_def) = 0 then
    raise exception 'audit anchor not found - fn_audit_capture body has changed';
  end if;

  v_new := replace(v_def, v_anchor, v_guard);

  if v_new = v_def then
    raise exception 'audit guard substitution made no change';
  end if;

  execute v_new;
end $$;

comment on function public.fn_audit_capture() is
  'Trigger-level audit capture. Returns early for super_admin actors, which are deliberately exempt - see migration 20260728220000.';
