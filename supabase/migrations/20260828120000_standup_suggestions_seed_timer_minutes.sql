-- The standup form now seeds a duration from the timer, so the note on
-- standup_suggestions() saying it never does is no longer true.
--
-- The original reasoning still holds and is why this is narrower than it sounds:
-- across the last 30 days the timer accounts for under four hours of an eight
-- hour day, so a duration invented for a task is wrong more often than right.
-- What changed is that only the `timer` rows carry a number now. Those are
-- measured. The `in_progress` and `commented` rows say WHAT was worked on and
-- nothing about how long, so they still arrive with an empty box.
--
-- Comment only. No behaviour, signature or grant changes.
COMMENT ON FUNCTION standup_suggestions() IS
  'Tasks the caller plausibly worked on today, strongest signal first. tracked_minutes is real measured timer time on ''timer'' rows and 0 on the others, and the form seeds a duration from the former only.';
