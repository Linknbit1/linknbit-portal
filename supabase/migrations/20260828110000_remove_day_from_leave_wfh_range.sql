-- Take a single day out of an approved (or pending) multi-day leave / WFH range.
--
-- Modelled as a SPLIT rather than an exclusions table, deliberately. Every reader
-- of these tables asks the same question the same way -- `p_date between
-- start_date and end_date`: day_roster, the two attendance sync triggers, the
-- leave-balance sums, the quest month buckets, the audit flags. An exclusions
-- table would leave all of them silently wrong until each learned about it,
-- whereas a range that no longer contains the day is already the truth to
-- everyone who asks.
--
-- The attendance rows come out right for free. Both sync triggers are written as
-- "revert OLD range, then apply NEW range", so shrinking a request un-marks the
-- days it used to cover and re-marks the ones it still does. `leave_requests.days`
-- likewise recomputes itself: trg_leave_set_days fires BEFORE UPDATE OF
-- start_date/end_date, so the balance follows without being touched here.
--
-- ORDER IS LOAD-BEARING when a day is taken out of the middle. The head must be
-- shrunk BEFORE the tail is inserted: shrinking reverts the whole original range,
-- so a tail inserted first would have its attendance rows wiped a statement later.
--
-- Additive: two new functions. No column, constraint or signature changes.

CREATE OR REPLACE FUNCTION public.remove_leave_day(p_request_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r leave_requests%ROWTYPE;
BEGIN
  IF NOT has_feature('can_manage_attendance') THEN
    RAISE EXCEPTION 'Not allowed to change attendance requests';
  END IF;

  SELECT * INTO r FROM leave_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Leave request not found'; END IF;

  IF r.status NOT IN ('approved', 'pending') THEN
    RAISE EXCEPTION 'Only an approved or pending request can have a day removed';
  END IF;
  IF r.day_part <> 'full' THEN
    -- A half day is a single day by constraint, so there is nothing to take out
    -- of it. Rejecting or deleting the request is the operation that applies.
    RAISE EXCEPTION 'A half-day request covers one day only. Reject it instead';
  END IF;
  IF p_date < r.start_date OR p_date > r.end_date THEN
    RAISE EXCEPTION 'That day is not part of this request';
  END IF;
  IF r.start_date = r.end_date THEN
    RAISE EXCEPTION 'This request is a single day. Reject it instead of removing the day';
  END IF;

  IF p_date = r.start_date THEN
    UPDATE leave_requests SET start_date = p_date + 1, updated_at = now() WHERE id = r.id;
  ELSIF p_date = r.end_date THEN
    UPDATE leave_requests SET end_date = p_date - 1, updated_at = now() WHERE id = r.id;
  ELSE
    -- Head first (see the header), then the tail as its own request.
    UPDATE leave_requests SET end_date = p_date - 1, updated_at = now() WHERE id = r.id;

    INSERT INTO leave_requests
      (profile_id, leave_type_id, start_date, end_date, day_part, reason, status,
       reviewed_by, reviewed_at, review_note, entered_by)
    VALUES
      (r.profile_id, r.leave_type_id, p_date + 1, r.end_date, r.day_part, r.reason, r.status,
       r.reviewed_by, r.reviewed_at, r.review_note, r.entered_by);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.remove_leave_day(uuid, date) IS
  'Removes one day from a multi-day leave request by shrinking or splitting the range. Attendance and the day count follow through the existing triggers.';

CREATE OR REPLACE FUNCTION public.remove_wfh_day(p_request_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r wfh_requests%ROWTYPE;
BEGIN
  IF NOT has_feature('can_manage_attendance') THEN
    RAISE EXCEPTION 'Not allowed to change attendance requests';
  END IF;

  SELECT * INTO r FROM wfh_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WFH request not found'; END IF;

  IF r.status NOT IN ('approved', 'pending') THEN
    RAISE EXCEPTION 'Only an approved or pending request can have a day removed';
  END IF;
  IF r.day_part <> 'full' THEN
    RAISE EXCEPTION 'A half-day request covers one day only. Reject it instead';
  END IF;
  IF p_date < r.start_date OR p_date > r.end_date THEN
    RAISE EXCEPTION 'That day is not part of this request';
  END IF;
  IF r.start_date = r.end_date THEN
    RAISE EXCEPTION 'This request is a single day. Reject it instead of removing the day';
  END IF;

  IF p_date = r.start_date THEN
    UPDATE wfh_requests SET start_date = p_date + 1, updated_at = now() WHERE id = r.id;
  ELSIF p_date = r.end_date THEN
    UPDATE wfh_requests SET end_date = p_date - 1, updated_at = now() WHERE id = r.id;
  ELSE
    UPDATE wfh_requests SET end_date = p_date - 1, updated_at = now() WHERE id = r.id;

    INSERT INTO wfh_requests
      (profile_id, start_date, end_date, day_part, reason, status,
       reviewed_by, reviewed_at, review_note, granted_directly)
    VALUES
      (r.profile_id, p_date + 1, r.end_date, r.day_part, r.reason, r.status,
       r.reviewed_by, r.reviewed_at, r.review_note, r.granted_directly);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.remove_wfh_day(uuid, date) IS
  'Removes one day from a multi-day WFH request by shrinking or splitting the range. Attendance follows through the existing sync trigger.';

REVOKE ALL ON FUNCTION public.remove_leave_day(uuid, date) FROM public, anon;
REVOKE ALL ON FUNCTION public.remove_wfh_day(uuid, date)   FROM public, anon;
GRANT EXECUTE ON FUNCTION public.remove_leave_day(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_wfh_day(uuid, date)   TO authenticated;
