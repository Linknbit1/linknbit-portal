-- Auto-earned points (standup +5, on-time check-in +3) are rewards the SYSTEM
-- gives, not a person's action — they should not appear in the audit log. Only
-- the xp_transactions branch of fn_audit_capture changes: skip a positive-amount
-- insert that has no granter. Manual grants (granted_by set) and spends (negative
-- amount) still log. Everything else in the function is unchanged from
-- 20260731170000.
--
-- Existing 84 auto-earned rows are purged below.

CREATE OR REPLACE FUNCTION public.fn_audit_capture()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_module       text := TG_ARGV[0];
  v_table        text := TG_TABLE_NAME;
  v_op           text := TG_OP;
  v_old          jsonb;
  v_new          jsonb;
  v_row          jsonb;
  v_record_id    uuid;
  v_changed      text[];
  v_actor        uuid := auth.uid();
  v_actor_kind   text := 'user';
  v_actor_name   text;
  v_actor_role   text;
  v_subject      uuid;
  v_subject_name text;
  v_action       text;
  v_severity     text := 'info';
  v_summary      text;
  v_target       text;
  v_flagged      boolean := false;
  v_flag_reason  text;
  v_context      jsonb := '{}'::jsonb;
  v_tz           text;
  v_grace        int;
  v_wstart       time;
  v_cutoff       timestamptz;
  v_leavecount   int;
BEGIN
  IF auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin') THEN
    RETURN NULL;
  END IF;

  v_old := CASE WHEN v_op <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
  v_new := CASE WHEN v_op <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  IF v_old ? 'doc' THEN v_old := v_old - 'doc'; END IF;
  IF v_new ? 'doc' THEN v_new := v_new - 'doc'; END IF;
  v_row := COALESCE(v_new, v_old);
  v_record_id := NULLIF(v_row->>'id','')::uuid;

  IF v_op = 'UPDATE' THEN
    SELECT array_agg(e.key ORDER BY e.key) INTO v_changed
    FROM jsonb_each(v_new) e
    WHERE e.value IS DISTINCT FROM (v_old -> e.key);
    IF v_changed IS NULL OR v_changed = ARRAY['updated_at'] THEN
      RETURN NULL;
    END IF;
  END IF;

  v_subject := COALESCE(
    NULLIF(v_row->>'profile_id','')::uuid,
    NULLIF(v_row->>'to_profile_id','')::uuid
  );

  IF v_actor IS NULL THEN
    v_actor := COALESCE(
      NULLIF(v_row->>'marked_by','')::uuid,
      NULLIF(v_row->>'granted_by','')::uuid,
      NULLIF(v_row->>'reviewed_by','')::uuid,
      NULLIF(v_row->>'entered_by','')::uuid,
      NULLIF(v_row->>'deleted_by','')::uuid,
      NULLIF(v_row->>'created_by','')::uuid,
      NULLIF(v_row->>'approved_by','')::uuid,
      NULLIF(v_row->>'awarded_by','')::uuid,
      NULLIF(v_row->>'updated_by','')::uuid,
      NULLIF(v_row->>'initiated_by','')::uuid,
      NULLIF(v_row->>'from_profile_id','')::uuid
    );
  END IF;

  v_action := v_table || '.' || lower(v_op);

  IF v_table = 'attendance' THEN
    IF (v_row->>'source') = 'self' THEN
      v_actor := COALESCE(v_actor, NULLIF(v_row->>'profile_id','')::uuid);
      v_actor_kind := 'self';
      v_action := CASE WHEN v_op='INSERT' THEN 'attendance.check_in' ELSE 'attendance.self_update' END;
    ELSIF (v_row->>'source') = 'system' THEN
      v_actor_kind := 'system';
      v_action := 'attendance.system_marked';
    ELSIF v_op = 'DELETE' THEN
      v_action := 'attendance.deleted'; v_severity := 'warning';
    ELSE
      v_action := CASE WHEN v_op='INSERT' THEN 'attendance.marked_on_behalf' ELSE 'attendance.edited' END;
      v_severity := 'warning';
    END IF;

    IF (v_row->>'source') <> 'system' AND v_actor_kind <> 'self' AND v_actor IS NOT NULL
       AND NULLIF(v_row->>'check_in','') IS NOT NULL THEN
      SELECT timezone, grace_period_min, work_start_time
        INTO v_tz, v_grace, v_wstart
        FROM attendance_settings WHERE singleton;
      IF v_tz IS NOT NULL THEN
        v_cutoff := (((v_row->>'date')::date + v_wstart) AT TIME ZONE v_tz)
                    + make_interval(mins => COALESCE(v_grace, 0));
        v_context := jsonb_build_object(
          'marked_check_in',  v_row->>'check_in',
          'real_action_time', now(),
          'late_cutoff',      v_cutoff,
          'grace_min',        v_grace);
        IF (v_row->>'check_in')::timestamptz <= v_cutoff
           AND now() > v_cutoff + interval '1 minute' THEN
          v_flagged := true; v_severity := 'danger';
          v_flag_reason := format(
            'Check-in recorded as %s (within grace) but the entry was actually made at %s, past the %s grace cutoff — back-dated to avoid a late mark.',
            to_char((v_row->>'check_in')::timestamptz AT TIME ZONE v_tz, 'HH24:MI'),
            to_char(now() AT TIME ZONE v_tz, 'HH24:MI'),
            to_char(v_cutoff AT TIME ZONE v_tz, 'HH24:MI'));
        END IF;
      END IF;
    END IF;

    IF v_op = 'UPDATE' AND (v_old->>'status') = 'late' AND (v_new->>'status') = 'present'
       AND (v_new->>'source') <> 'system' AND v_actor IS NOT NULL THEN
      v_flagged := true; v_severity := 'danger';
      v_flag_reason := trim(BOTH ' ' FROM COALESCE(v_flag_reason,'') || ' Status manually changed from late to present.');
    END IF;

  ELSIF v_table IN ('holidays','company_wfh_days','working_saturdays') THEN
    v_subject := NULL;
    IF v_op = 'DELETE' THEN
      v_action := v_table || '.deleted'; v_severity := 'warning';
      SELECT count(*) INTO v_leavecount FROM leave_requests lr
       WHERE (v_row->>'date')::date BETWEEN lr.start_date AND lr.end_date;
      IF v_leavecount > 0 THEN
        v_flagged := true; v_severity := 'danger';
        v_flag_reason := format('Off-day (%s) deleted while %s leave request(s) overlap that date — removing it turns those days into paid working leave.',
          v_row->>'date', v_leavecount);
        v_context := jsonb_build_object('overlapping_leave', v_leavecount, 'date', v_row->>'date');
      END IF;
    ELSIF v_op = 'INSERT' THEN
      v_action := v_table || '.created'; v_severity := 'warning';
    END IF;

  ELSIF v_table = 'attendance_settings' THEN
    v_subject := NULL;
    v_action := 'attendance_settings.updated'; v_severity := 'warning';

  ELSIF v_table = 'leave_requests' THEN
    IF v_op = 'INSERT' THEN
      IF NULLIF(v_row->>'entered_by','') IS NOT NULL THEN
        v_action := 'leave.entered_on_behalf'; v_severity := 'warning';
        IF (v_row->>'status') = 'approved'
           AND COALESCE(v_row->>'reviewed_by', v_row->>'entered_by') = (v_row->>'entered_by') THEN
          v_flagged := true; v_severity := 'danger';
          v_flag_reason := 'Leave entered on someone''s behalf and immediately approved by the same person (no independent review).';
        END IF;
      ELSE
        v_action := 'leave.requested';
      END IF;
    ELSIF v_op = 'UPDATE' AND (v_old->>'status') = 'pending'
          AND (v_new->>'status') IN ('approved','rejected') THEN
      v_action := 'leave.' || (v_new->>'status');
    ELSIF v_op = 'DELETE' THEN
      v_action := 'leave.deleted'; v_severity := 'warning';
    END IF;

  ELSIF v_table = 'wfh_requests' THEN
    IF v_op = 'INSERT' AND (v_row->>'granted_directly') = 'true' THEN
      v_action := 'wfh.granted_directly'; v_severity := 'warning';
    ELSIF v_op = 'UPDATE' AND (v_old->>'status') = 'pending'
          AND (v_new->>'status') IN ('approved','rejected') THEN
      v_action := 'wfh.' || (v_new->>'status');
    ELSIF v_op = 'INSERT' THEN
      v_action := 'wfh.requested';
    END IF;

  ELSIF v_table = 'overtime_requests' THEN
    IF v_op = 'UPDATE' AND (v_old->>'status') = 'pending'
       AND (v_new->>'status') IN ('approved','rejected') THEN
      v_action := 'overtime.' || (v_new->>'status');
    ELSIF v_op = 'INSERT' THEN
      v_action := 'overtime.requested';
    END IF;

  ELSIF v_table = 'attendance_exceptions' THEN
    IF v_op = 'UPDATE' AND (v_old->>'status') = 'pending'
       AND (v_new->>'status') IN ('approved','rejected') THEN
      v_action := 'exception.' || (v_new->>'status');
    ELSIF v_op = 'INSERT' THEN
      v_action := 'exception.requested';
    END IF;

  ELSIF v_table = 'enrolled_devices' THEN
    v_action := CASE WHEN (v_new->>'is_active') = 'true' THEN 'device.approved' ELSE 'device.deactivated' END;
    v_severity := 'warning';

  ELSIF v_table = 'xp_transactions' THEN
    -- Auto-earned points (standup, on-time check-in) are system rewards, not a
    -- person's action → don't log. Manual grants and spends still log.
    IF (v_row->>'amount')::int >= 0 AND NULLIF(v_row->>'granted_by','') IS NULL THEN
      RETURN NULL;
    END IF;
    v_action := CASE WHEN (v_row->>'amount')::int >= 0 THEN 'xp.granted' ELSE 'xp.spent' END;
    IF (v_row->>'amount')::int > 0 AND NULLIF(v_row->>'granted_by','') IS NOT NULL THEN
      v_severity := 'warning';
      IF (v_row->>'granted_by') = (v_row->>'profile_id') THEN
        v_flagged := true; v_severity := 'danger';
        v_flag_reason := 'Points granted by a user to themselves.';
      ELSIF (v_row->>'amount')::int >= 200 THEN
        v_flagged := true; v_severity := 'danger';
        v_flag_reason := format('Unusually large manual grant of %s points.', v_row->>'amount');
      END IF;
    END IF;

  ELSIF v_table = 'shoutouts' THEN
    IF v_op = 'INSERT' THEN
      v_action := 'shoutout.given';
    ELSIF v_op = 'UPDATE' AND (v_old->>'status') = 'pending'
          AND (v_new->>'status') IN ('approved','rejected') THEN
      v_action := 'shoutout.' || (v_new->>'status');
      IF (v_new->>'status') = 'approved' THEN v_severity := 'warning'; END IF;
    END IF;

  ELSIF v_table = 'reward_redemptions' THEN
    IF v_op = 'INSERT' THEN
      v_action := 'reward.redeemed';
    ELSIF v_op = 'UPDATE' AND (v_old->>'status') IS DISTINCT FROM (v_new->>'status') THEN
      v_action := 'reward.' || (v_new->>'status');
      IF (v_new->>'status') IN ('approved','fulfilled') THEN v_severity := 'warning'; END IF;
    END IF;

  ELSIF v_table = 'reward_pools' THEN
    v_subject := NULLIF(v_row->>'initiated_by','')::uuid;
    IF v_op = 'INSERT' THEN
      v_action := 'reward_pool.opened';
    ELSIF v_op = 'UPDATE' AND (v_old->>'status') IS DISTINCT FROM (v_new->>'status') THEN
      v_action := 'reward_pool.' || (v_new->>'status');
      IF (v_new->>'status') IN ('approved','fulfilled') THEN v_severity := 'warning'; END IF;
    END IF;

  ELSIF v_table = 'quest_task_claims' THEN
    IF v_op = 'UPDATE' AND (v_old->>'status') IS DISTINCT FROM (v_new->>'status') THEN
      v_action := 'quest.' || (v_new->>'status');
      IF (v_new->>'status') = 'approved' THEN v_severity := 'warning'; END IF;
    END IF;

  ELSIF v_table = 'badge_awards' THEN
    IF v_op = 'INSERT' THEN
      v_action := 'badge.awarded';
      IF NULLIF(v_row->>'awarded_by','') IS NOT NULL THEN v_severity := 'warning'; END IF;
    ELSIF v_op = 'DELETE' THEN
      v_action := 'badge.revoked'; v_severity := 'warning';
    END IF;

  ELSIF v_table = 'employee_of_the_month' THEN
    v_action := 'eotm.' || lower(v_op);
    IF v_op IN ('INSERT','DELETE') THEN v_severity := 'warning'; END IF;

  ELSIF v_table = 'rewards' THEN
    v_subject := NULL;
    v_action := 'reward_catalog.' || lower(v_op);
    IF v_op = 'DELETE' THEN v_severity := 'warning'; END IF;

  ELSIF v_table = 'quest_tasks' THEN
    v_subject := NULL;
    v_action := 'quest_catalog.' || lower(v_op);
    IF v_op = 'DELETE' THEN v_severity := 'warning'; END IF;

  ELSIF v_table = 'profiles' THEN
    v_subject := NULLIF(v_row->>'id','')::uuid;
    v_action := CASE WHEN (v_new->>'is_restricted') = 'true'
                     THEN 'participation.restricted' ELSE 'participation.unrestricted' END;
    v_severity := 'warning';

  ELSIF v_table IN ('projects','tasks','clients') THEN
    v_subject := NULL;
    IF v_op = 'UPDATE' AND NULLIF(v_new->>'deleted_at','') IS NOT NULL
       AND NULLIF(v_old->>'deleted_at','') IS NULL THEN
      v_action := v_table || '.deleted'; v_severity := 'warning';
      v_actor := COALESCE(v_actor, NULLIF(v_new->>'deleted_by','')::uuid);
    ELSIF v_op = 'UPDATE' AND NULLIF(v_new->>'deleted_at','') IS NULL
          AND NULLIF(v_old->>'deleted_at','') IS NOT NULL THEN
      v_action := v_table || '.restored'; v_severity := 'warning';
    ELSIF v_op = 'DELETE' THEN
      v_action := v_table || '.hard_deleted'; v_severity := 'warning';
    ELSIF v_op = 'INSERT' THEN
      v_action := v_table || '.created';
    ELSE
      v_action := v_table || '.updated';
    END IF;

  ELSIF v_table = 'approvals' THEN
    IF v_op = 'UPDATE' AND (v_old->>'status') IS DISTINCT FROM (v_new->>'status') THEN
      v_action := 'approval.' || (v_new->>'status');
    ELSIF v_op = 'INSERT' THEN
      v_action := 'approval.submitted';
    END IF;

  ELSIF v_table IN ('comments','subtasks','attachments') THEN
    v_action := v_table || '.deleted';

  ELSIF v_table IN ('project_members','task_assignees','service_members','project_services') THEN
    v_subject := NULLIF(v_row->>'profile_id','')::uuid;
    v_action := CASE
      WHEN v_table = 'service_members'  THEN CASE WHEN v_op='INSERT' THEN 'service_member.added'  ELSE 'service_member.removed'  END
      WHEN v_table = 'project_services' THEN CASE WHEN v_op='INSERT' THEN 'project_service.added' ELSE 'project_service.removed' END
      ELSE CASE WHEN v_op='INSERT' THEN v_table || '.added' ELSE v_table || '.removed' END
    END;
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT name, role INTO v_actor_name, v_actor_role FROM profiles WHERE id = v_actor;
    v_actor_name := COALESCE(v_actor_name, 'Unknown');
    v_actor_role := COALESCE(v_actor_role, 'unknown');
  ELSE
    IF v_actor_kind <> 'self' THEN v_actor_kind := 'system'; END IF;
    v_actor_name := 'System';
    v_actor_role := 'system';
  END IF;

  IF v_actor IS NULL AND v_actor_kind <> 'self' THEN
    RETURN NULL;
  END IF;

  IF v_subject IS NOT NULL THEN
    SELECT name INTO v_subject_name FROM profiles WHERE id = v_subject;
  END IF;

  SELECT o_summary, o_target INTO v_summary, v_target
    FROM fn_audit_describe(v_action, v_table, v_op, v_actor_name, v_subject_name, v_row);

  INSERT INTO audit_log(
    module, table_name, record_id, operation, action, severity,
    actor_id, actor_name, actor_role, actor_kind,
    subject_id, subject_name, target_name, summary,
    old_values, new_values, changed_fields, flagged, flag_reason, context)
  VALUES (
    v_module, v_table, v_record_id, v_op, v_action, v_severity,
    v_actor, v_actor_name, v_actor_role, v_actor_kind,
    v_subject, v_subject_name, v_target, v_summary,
    v_old, v_new, v_changed, v_flagged, v_flag_reason, v_context);

  IF v_severity = 'danger' THEN
    PERFORM fn_notify(
      p.id, 'audit_alert',
      'Flagged action detected',
      COALESCE(v_flag_reason, v_summary),
      'audit_alert', v_record_id::text, v_actor)
    FROM profiles p
    WHERE p.is_active AND p.role IN ('super_admin','admin');
  END IF;

  RETURN NULL;
END;
$$;

-- Purge the auto-earned rows already captured.
DELETE FROM audit_log
 WHERE table_name = 'xp_transactions'
   AND (new_values->>'amount')::int >= 0
   AND NULLIF(new_values->>'granted_by','') IS NULL;
