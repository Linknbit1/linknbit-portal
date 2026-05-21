-- fn_validate_checkout had inverted logic: it blocked checkouts AFTER work_end_time
-- (i.e. normal checkouts). The attendance-checkout edge function already handles
-- early-checkout prevention correctly. Drop the trigger and function entirely.
DROP TRIGGER IF EXISTS trg_attendance_checkout_validate ON attendance;
DROP FUNCTION IF EXISTS public.fn_validate_checkout();
