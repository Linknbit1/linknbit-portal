-- A blocked task said nothing about what it was blocked on, and aged invisibly.
--
-- 10 tasks are blocked, untouched for 18 days on average and 48 at worst. The
-- status was a dead end: no reason, nobody named, no clock. Somebody had to
-- already know to go looking.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS blocked_on_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blocked_since  timestamptz;

CREATE INDEX IF NOT EXISTS idx_tasks_blocked_on_id ON public.tasks (blocked_on_id);

COMMENT ON COLUMN public.tasks.blocked_reason IS 'What is stopping this task. Required while status is blocked.';
COMMENT ON COLUMN public.tasks.blocked_on_id  IS 'Who can unblock it, when that is a person. Optional: some blockers are not somebody.';
COMMENT ON COLUMN public.tasks.blocked_since  IS 'When it became blocked. Stamped by trigger, cleared when it moves on.';

CREATE OR REPLACE FUNCTION public.fn_track_blocked_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'blocked' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'blocked') THEN
    IF COALESCE(btrim(NEW.blocked_reason), '') = '' THEN
      RAISE EXCEPTION 'blocked_reason_required'
        USING HINT = 'Say what the task is blocked on before marking it blocked.';
    END IF;
    NEW.blocked_since := COALESCE(NEW.blocked_since, now());
  ELSIF NEW.status IS DISTINCT FROM 'blocked' THEN
    NEW.blocked_since  := NULL;
    NEW.blocked_reason := NULL;
    NEW.blocked_on_id  := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_tasks_track_blocked ON public.tasks;
CREATE TRIGGER trg_tasks_track_blocked
  BEFORE INSERT OR UPDATE OF status, blocked_reason ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION fn_track_blocked_state();

-- The ten already blocked predate the rule. Stamp them from their last update so
-- the age reads honestly, and say plainly that nobody recorded why rather than
-- inventing a reason.
UPDATE public.tasks
   SET blocked_since  = COALESCE(blocked_since, updated_at),
       blocked_reason = COALESCE(NULLIF(btrim(blocked_reason), ''), 'No reason recorded — blocked before this was asked for')
 WHERE status = 'blocked';
