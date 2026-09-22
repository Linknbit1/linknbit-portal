-- A standup no longer has to add up to a full day.
--
-- fn_validate_standup_entries REJECTED any standup whose minutes did not total the
-- working day, and refused anything above it unless make-up time was owed. Not a
-- warning — the row would not save.
--
-- What that produced: 194 of 213 standups totalling exactly 480 minutes. 91%. The
-- number was not a measurement of anything, it was the number the form would
-- accept, and everyone had worked out how to reach it. Every report built on
-- standup minutes was reading compliance with a rule rather than where time went.
--
-- The comparison that made it plain: on the 146 days where somebody filed a
-- standup AND ran the timer, standup claimed 466 minutes on average and the timer
-- recorded 347. Two hours a day of difference, on 27 of those days more than half.
-- The timer was telling the truth.
--
-- Nobody does eight focused hours in an eight-hour day. People take breaks, pray,
-- eat, help someone, sit in a meeting. Five to six is normal. Demanding eight only
-- guarantees the shortfall is invented.
--
-- So: the structural checks stay (at least one update, a project or a title of its
-- own, a description long enough to mean something), and the arithmetic goes. The
-- minutes field remains and is still worth filling in — it is a note on where the
-- day went — but nothing is refused because of its total, and hours are the
-- timer's job.
--
-- standup_settings.enforce_required_hours is now read by nothing. The toggle is
-- gone from Settings in the same change. The column is left in place for one
-- release rather than dropped under a deployed bundle that still selects it;
-- dropping it is a separate contract migration.

CREATE OR REPLACE FUNCTION public.fn_validate_standup_entries(p_profile uuid, p_date date, p_entries jsonb)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ss standup_settings;
  v_entry jsonb;
  v_len int;
BEGIN
  SELECT * INTO ss FROM standup_settings LIMIT 1;

  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RAISE EXCEPTION 'Add at least one update' USING ERRCODE = 'P0005';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    IF NULLIF(v_entry->>'project_id','') IS NULL
       AND length(btrim(COALESCE(v_entry->>'title',''))) < 3 THEN
      RAISE EXCEPTION 'Every update needs a project, or a title of its own' USING ERRCODE = 'P0011';
    END IF;

    v_len := length(btrim(COALESCE(v_entry->>'work_done', '')));
    IF v_len < ss.min_work_done_chars THEN
      RAISE EXCEPTION 'Each update needs at least % characters (one has %)',
        ss.min_work_done_chars, v_len USING ERRCODE = 'P0009';
    END IF;
  END LOOP;
END;
$function$;
