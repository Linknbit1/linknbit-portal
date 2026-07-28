-- RLS golden-baseline snapshot.
--
-- For every real profile, records:
--   1. the answer to has_feature() for every permission key      -> allow | deny
--   2. how much of each sensitive table is visible under RLS     -> none | partial | all
--
-- Row counts are deliberately NOT recorded verbatim. They drift as the team
-- uses the app, which would make every run a false failure. The visibility
-- class is stable against ordinary data growth while still catching the thing
-- that matters: someone gaining or losing access to a table.
--
-- Output is a deterministic TSV, captured as a golden file and diffed after
-- every migration. A diff means someone's access changed - intended or not.
--
-- SAFETY: the whole run is wrapped in BEGIN/ROLLBACK and every helper lives in
-- pg_temp, so this script creates no permanent objects and cannot persist a
-- write. It is safe to run against production.

\set ON_ERROR_STOP on
\pset format unaligned
\pset fieldsep '\t'
\pset tuples_only on
\pset footer off

begin;

-- Tables whose visibility is security-relevant.
create temp table _probe_tables (name text primary key);
insert into _probe_tables (name) values
  ('attachments'), ('attendance'), ('audit_log'), ('channels'), ('clients'),
  ('employee_salaries'), ('leave_requests'), ('messages'), ('overtime_requests'),
  ('profiles'), ('projects'), ('standup_entries'), ('standups'), ('tasks'),
  ('teams'), ('wfh_requests');
-- `standups` was added after a Phase 2 regression widened team-lead access to
-- every standup and went unnoticed because only standup_entries was probed.
-- When a policy is converted, make sure its table is in this list.

create function pg_temp.snapshot()
returns table (subject text, check_name text, value text)
language plpgsql
as $fn$
declare
  r_profile record;
  r_key     record;
  r_tbl     record;
  v_allowed boolean;
  v_count   bigint;
  v_total   bigint;
begin
  for r_profile in
    select id, role from profiles order by role, id
  loop
    subject := r_profile.role || '/' || r_profile.id::text;

    for r_key in
      -- Read the live catalog, not the legacy flag table, so newly added
      -- permission keys are covered automatically.
      select key as feature_key from permissions order by key
    loop
      perform set_config('request.jwt.claims',
        json_build_object('sub', r_profile.id, 'role', 'authenticated')::text, true);
      set local role authenticated;
      select has_feature(r_key.feature_key) into v_allowed;
      reset role;

      check_name := 'perm:' || r_key.feature_key;
      value      := case when v_allowed then 'allow' else 'deny' end;
      return next;
    end loop;

    for r_tbl in select name from _probe_tables order by name
    loop
      -- Total is read as the privileged session role, bypassing RLS.
      execute format('select count(*) from public.%I', r_tbl.name) into v_total;

      perform set_config('request.jwt.claims',
        json_build_object('sub', r_profile.id, 'role', 'authenticated')::text, true);
      set local role authenticated;
      execute format('select count(*) from public.%I', r_tbl.name) into v_count;
      reset role;

      check_name := 'rows:' || r_tbl.name;
      value := case
                 when v_count = 0                    then 'none'
                 when v_total > 0 and v_count = v_total then 'all'
                 else 'partial'
               end;
      return next;
    end loop;
  end loop;
end
$fn$;

select subject || E'\t' || check_name || E'\t' || value
from pg_temp.snapshot()
order by subject, check_name;

rollback;
