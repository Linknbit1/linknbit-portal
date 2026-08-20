-- ════════════════════════════════════════════════════════════════════
-- Everything a lead record could not hold.
--
-- The department's own prospect spreadsheet tracks a website for 112 of its 142
-- companies, a country for 114, a city for 86, plus social profiles and a Drive
-- link to the proposal that was sent. None of it had a column here, so importing
-- that sheet would have silently dropped all of it.
--
-- `socials` and `documents` are repeaters, kept as jsonb arrays on the row
-- rather than child tables: they are only ever read with the lead, only ever
-- written wholesale by the lead form, and BD's writes are optimistic — a child
-- table would turn one atomic patch into a diff of inserts and deletes for no
-- gain in queryability.
--
--   socials    [{ "url": "https://linkedin.com/in/…" }]
--   documents  [{ "title": "Website Redesign Proposal", "url": "https://…" }]
--
-- The platform behind a social link is derived from the URL at render time, not
-- stored: a guess persisted at insert is a guess that goes stale silently.
--
-- Additive — every column is nullable-by-default or defaulted, so a deployed
-- client that has never heard of them keeps working.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE bd_leads
  ADD COLUMN IF NOT EXISTS website   text  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country   text  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city      text  NOT NULL DEFAULT '',
  -- Where the lead came from before the portal existed: the Drive folder, the
  -- Fiverr archive, the sales sheet. Free text on purpose — it is provenance,
  -- not a taxonomy, and `channel` already carries the one that reports read.
  ADD COLUMN IF NOT EXISTS source    text  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS socials   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Both repeaters are arrays of objects; anything else is a client bug, and a
-- constraint is cheaper than finding out from a render crash.
ALTER TABLE bd_leads
  DROP CONSTRAINT IF EXISTS bd_leads_socials_is_array,
  ADD  CONSTRAINT bd_leads_socials_is_array CHECK (jsonb_typeof(socials) = 'array');

ALTER TABLE bd_leads
  DROP CONSTRAINT IF EXISTS bd_leads_documents_is_array,
  ADD  CONSTRAINT bd_leads_documents_is_array CHECK (jsonb_typeof(documents) = 'array');

COMMENT ON COLUMN bd_leads.socials   IS 'Repeater: [{url}]. Platform is derived from the URL in the UI, never stored.';
COMMENT ON COLUMN bd_leads.documents IS 'Repeater: [{title, url}] — proposals and decks that live in Drive.';
