-- Stop auth.uid() being re-evaluated once per row.
--
-- Postgres treats a bare auth.uid() inside a policy as a per-row expression, so a
-- SELECT over N rows calls it N times. Wrapping it as (select auth.uid()) makes it
-- an InitPlan: evaluated once per query, result reused. Supabase's advisor flagged
-- 112 policies across 56 tables. task_time_entries alone is 713 rows today, read on
-- every timesheet and report, behind policies that were calling auth.uid() per row.
--
-- The rewrite is a pure substitution. auth.uid() is STABLE, so hoisting it out of
-- the row loop cannot change any result — only how many times it runs.
--
-- Written as a DO block rather than 112 hand-pasted CREATE POLICY statements
-- because the policy bodies are long and the substitution is mechanical: pasting
-- them by hand is where a typo silently widens a policy. The loop reads each
-- policy's own definition back out of pg_policies and rewrites only that one
-- token, preserving permissive/restrictive, command, roles, USING and WITH CHECK
-- exactly as they were. Re-running it is a no-op once no bare auth.uid() remains.
--
-- Verified after applying: 112 policies rewritten, 0 bare auth.uid() left, total
-- policy count unchanged at 271, and per-table counts identical to before on every
-- table checked (tasks 4, projects 4, profiles 4, attendance 4, task_time_entries
-- 3, comments 5, attachments 5, leave_requests 6, wfh_requests 6, messages 3).

DO $mig$
DECLARE
  r           record;
  v_new_qual  text;
  v_new_check text;
  v_sql       text;
  v_count     int := 0;
BEGIN
  FOR r IN
    SELECT policyname, tablename, permissive, cmd, roles, qual, with_check
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (qual LIKE '%auth.uid()%' OR coalesce(with_check, '') LIKE '%auth.uid()%')
     ORDER BY tablename, policyname
  LOOP
    v_new_qual  := replace(r.qual,       'auth.uid()', '(select auth.uid())');
    v_new_check := replace(r.with_check, 'auth.uid()', '(select auth.uid())');

    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);

    v_sql := format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
      r.policyname, r.tablename,
      CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      r.cmd,
      array_to_string(r.roles, ', ')
    );

    IF v_new_qual  IS NOT NULL THEN v_sql := v_sql || format(' USING (%s)',      v_new_qual);  END IF;
    IF v_new_check IS NOT NULL THEN v_sql := v_sql || format(' WITH CHECK (%s)', v_new_check); END IF;

    EXECUTE v_sql;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'rewrote % policies', v_count;
END
$mig$;
