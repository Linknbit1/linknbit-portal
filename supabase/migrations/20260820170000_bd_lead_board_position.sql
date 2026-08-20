-- ════════════════════════════════════════════════════════════════════
-- Pipeline cards get a manual order.
--
-- Until now a lead's place in its column was whatever the sort dropdown said,
-- so a card could be dragged between stages but never up or down. This is the
-- same `position` mechanism bd_tasks already uses: a sparse double, so an
-- insertion between two neighbours is one UPDATE (the midpoint) rather than a
-- renumber of the whole column.
--
-- Additive — a client that has never heard of `position` keeps working, so no
-- expand/migrate/contract dance is needed.
--
-- The backfill numbers each stage by descending value, which is what the board
-- was sorted by out of the box. Day one under "Manual order" therefore looks
-- exactly like the pipeline people already know.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE bd_leads
  ADD COLUMN IF NOT EXISTS position double precision NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id,
         row_number() OVER (PARTITION BY stage ORDER BY value DESC, created_at DESC) * 1000 AS pos
    FROM bd_leads
)
UPDATE bd_leads l
   SET position = o.pos
  FROM ordered o
 WHERE o.id = l.id;

CREATE INDEX IF NOT EXISTS idx_bd_leads_board ON bd_leads (stage, position);
