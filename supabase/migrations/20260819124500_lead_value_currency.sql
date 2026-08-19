-- A deal quoted in dollars should read as dollars on the card, but the funnel,
-- the channel report and every target actual add lead values together — and a
-- sum across mixed currencies is a number that means nothing.
--
-- So `value` keeps its meaning exactly as it was: the PKR figure everything
-- sums. What the rep typed is recorded beside it, with the rate used at the
-- time, so $1,550 still reads as $1,550 a year later even after the rate moves.
-- Nothing that reads `value` today needs to change.
--
-- Purely additive: three nullable/defaulted columns. No deployed client can
-- break on a column it does not know about.
ALTER TABLE bd_leads
  ADD COLUMN value_currency text    NOT NULL DEFAULT 'PKR',
  ADD COLUMN value_entered  numeric,
  ADD COLUMN value_fx_rate  numeric;

COMMENT ON COLUMN bd_leads.value          IS 'Deal value in PKR. The only column any total or report may sum.';
COMMENT ON COLUMN bd_leads.value_currency IS 'Currency the deal was quoted in (ISO 4217).';
COMMENT ON COLUMN bd_leads.value_entered  IS 'The amount as typed, in value_currency. Null means it was entered directly in PKR.';
COMMENT ON COLUMN bd_leads.value_fx_rate  IS 'PKR per 1 unit of value_currency at the moment it was entered. Frozen; refreshing rates never restates a stored deal.';
