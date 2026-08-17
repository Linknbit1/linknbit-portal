-- When a lead closed, as opposed to when it was created.
--
-- The Targets page plots revenue by month. Without this there is no honest way
-- to answer "how much did we close in June": `added_on` is when the lead
-- arrived, and a deal that took eleven weeks would be booked to the month it was
-- first contacted. `updated_at` is worse — it moves every time anyone edits a
-- phone number.
--
-- Stamped by a trigger rather than by the app so it is true regardless of which
-- screen moved the stage (the board, the drawer, a drag on the pipeline), and so
-- it cannot be back-dated from the client.
--
-- Covers 'lost' and 'unqualified' too: win rate over time needs both halves, and
-- a column called closed_at that only records wins is a trap for the next person.

ALTER TABLE bd_leads ADD COLUMN closed_at timestamptz;

CREATE INDEX idx_bd_leads_closed_at ON bd_leads (closed_at) WHERE closed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION fn_bd_stamp_closed_at() RETURNS trigger AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NEW.stage IN ('won', 'lost', 'unqualified') THEN
      -- Only on the transition *into* a closed stage. Moving won → lost keeps
      -- the original close date, which is what a correction means; re-closing a
      -- reopened lead re-stamps it, because that genuinely is a new close.
      IF OLD.stage NOT IN ('won', 'lost', 'unqualified') THEN
        NEW.closed_at := now();
      END IF;
    ELSE
      -- Reopened. It is no longer closed, so it has no close date.
      NEW.closed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bd_stamp_closed_at BEFORE UPDATE OF stage ON bd_leads
  FOR EACH ROW EXECUTE FUNCTION fn_bd_stamp_closed_at();

-- A lead created directly at a closed stage (importing history, logging a deal
-- that closed the same day it arrived) needs the stamp too.
CREATE OR REPLACE FUNCTION fn_bd_stamp_closed_at_insert() RETURNS trigger AS $$
BEGIN
  IF NEW.stage IN ('won', 'lost', 'unqualified') AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bd_stamp_closed_at_insert BEFORE INSERT ON bd_leads
  FOR EACH ROW EXECUTE FUNCTION fn_bd_stamp_closed_at_insert();
