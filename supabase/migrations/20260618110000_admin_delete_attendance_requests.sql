-- Admin-only deletion of attendance requests (leave / WFH / exception / overtime).
-- Only admin + super_admin may delete. HR keeps approve/reject but not delete.
--
-- Side effects: approved leave/WFH sync rows into `attendance`. The existing sync
-- triggers only cleaned those up on UPDATE (un-approve); here we extend them to also
-- fire on DELETE so removing an approved request removes its synced attendance rows
-- (no orphans). Overtime aggregates at read time (no stored side effect). Exceptions'
-- excluded_minutes are cumulative and are NOT auto-reversed on delete.

-- ── DELETE RLS policies (admin + super_admin only) ──────────────────────────────
DROP POLICY IF EXISTS p_leave_delete ON leave_requests;
CREATE POLICY p_leave_delete ON leave_requests FOR DELETE
  USING (current_user_role() = ANY (ARRAY['admin', 'super_admin']));

DROP POLICY IF EXISTS p_wfh_delete ON wfh_requests;
CREATE POLICY p_wfh_delete ON wfh_requests FOR DELETE
  USING (current_user_role() = ANY (ARRAY['admin', 'super_admin']));

DROP POLICY IF EXISTS p_exc_delete ON attendance_exceptions;
CREATE POLICY p_exc_delete ON attendance_exceptions FOR DELETE
  USING (current_user_role() = ANY (ARRAY['admin', 'super_admin']));

DROP POLICY IF EXISTS p_ot_delete ON overtime_requests;
CREATE POLICY p_ot_delete ON overtime_requests FOR DELETE
  USING (current_user_role() = ANY (ARRAY['admin', 'super_admin']));

-- ── Sync approved WFH → attendance (now also reverses on DELETE) ────────────────
CREATE OR REPLACE FUNCTION fn_sync_wfh_to_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Un-approve / delete cleanup: remove a previously-synced row.
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'approved' THEN
    DELETE FROM attendance
    WHERE profile_id = OLD.profile_id AND date = OLD.date
      AND source = 'system' AND status = 'wfh';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.status = 'approved' AND fn_is_working_day(NEW.date) THEN
    INSERT INTO attendance (profile_id, date, status, source, marked_by, note)
    VALUES (NEW.profile_id, NEW.date, 'wfh', 'system', NEW.reviewed_by, 'Work from home')
    ON CONFLICT (profile_id, date) DO UPDATE
      SET status = 'wfh', source = 'system', marked_by = EXCLUDED.marked_by, updated_at = now()
      WHERE attendance.source <> 'self';   -- never clobber a real check-in
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wfh_sync ON wfh_requests;
CREATE TRIGGER trg_wfh_sync
  AFTER INSERT OR UPDATE OR DELETE ON wfh_requests
  FOR EACH ROW EXECUTE FUNCTION fn_sync_wfh_to_attendance();

-- ── Sync approved Leave → attendance (now also reverses on DELETE) ─────────────
CREATE OR REPLACE FUNCTION fn_sync_leave_to_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type_name text;
  v_status    text;
BEGIN
  -- Un-approve / delete cleanup: remove previously-synced leave OR half_day rows.
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'approved' THEN
    DELETE FROM attendance
    WHERE profile_id = OLD.profile_id AND source = 'system'
      AND status IN ('leave', 'half_day')
      AND date BETWEEN OLD.start_date AND OLD.end_date;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.status = 'approved' THEN
    SELECT name INTO v_type_name FROM leave_types WHERE id = NEW.leave_type_id;
    v_status := CASE WHEN NEW.day_part = 'full' THEN 'leave' ELSE 'half_day' END;

    INSERT INTO attendance (profile_id, date, status, source, marked_by, note)
    SELECT NEW.profile_id, g.d::date, v_status, 'system', NEW.reviewed_by,
           COALESCE(v_type_name, 'Leave')
           || CASE NEW.day_part
                WHEN 'first_half'  THEN ' (first half)'
                WHEN 'second_half' THEN ' (second half)'
                ELSE ''
              END
    FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
    WHERE fn_is_working_day(g.d::date)
    ON CONFLICT (profile_id, date) DO UPDATE
      SET status = EXCLUDED.status, source = 'system', marked_by = EXCLUDED.marked_by,
          note = EXCLUDED.note, updated_at = now()
      WHERE attendance.source <> 'self';   -- never clobber a real check-in
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leave_sync ON leave_requests;
CREATE TRIGGER trg_leave_sync
  AFTER INSERT OR UPDATE OR DELETE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_sync_leave_to_attendance();
