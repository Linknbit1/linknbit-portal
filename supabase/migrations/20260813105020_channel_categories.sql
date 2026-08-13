-- Discord-style categories: a heading in the sidebar that channels sit under.
--
-- A category is a label and an ordering, nothing more. It grants no access and
-- hides nothing: every channel inside is still filtered by the same RLS as
-- before, so a category with ten channels shows you only the ones you are in
-- (or, for a channel administrator, all of them). That keeps the grouping a
-- pure display concern and means a category name can never leak membership.
--
-- Deleting a category does NOT delete its channels — they fall back to
-- Uncategorised, which is why category_id is ON DELETE SET NULL. Removing a
-- heading should never destroy conversations underneath it.

CREATE TABLE IF NOT EXISTS channel_categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL CHECK (btrim(name) <> ''),
  -- Sidebar order. Ties fall back to name, so a fresh set of zeroes still reads
  -- predictably instead of shuffling between loads.
  position   int         NOT NULL DEFAULT 0,
  created_by uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_categories_name ON channel_categories (lower(btrim(name)));

ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES channel_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_channels_category ON channels (category_id);

COMMENT ON TABLE channel_categories IS
  'Sidebar headings for named channels. Display grouping only — access is decided entirely by channel RLS.';
COMMENT ON COLUMN channels.category_id IS
  'Optional sidebar heading. NULL means the channel lists under Uncategorised.';

ALTER TABLE channel_categories ENABLE ROW LEVEL SECURITY;

-- Any internal user reads the headings; only channel administrators shape them.
CREATE POLICY p_channel_categories_select ON channel_categories FOR SELECT
  USING (is_internal());

CREATE POLICY p_channel_categories_write ON channel_categories FOR ALL
  USING (is_internal() AND has_feature('can_administer_channels'))
  WITH CHECK (is_internal() AND has_feature('can_administer_channels'));
