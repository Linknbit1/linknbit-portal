-- Live FX rates, refreshed in the database rather than in each browser.
--
-- A rate fetched per client would mean two people pricing the same deal a
-- minute apart could stamp different numbers on it, and would put the agency's
-- pipeline at the mercy of a third-party API being reachable from every desk.
-- So one scheduled fetch fills a table, and every client reads that table.
--
-- pg_net is asynchronous: http_get() queues a request and returns an id, the
-- response turns up in net._http_response later. That is why the refresh is two
-- functions on two schedules rather than one — there is nothing to parse at the
-- moment the request is made.

CREATE TABLE currency_rates (
  code          text        PRIMARY KEY,
  -- PKR per 1 unit. Stored in this direction because it is the direction every
  -- caller needs: a deal is quoted in USD and has to become PKR to be summed.
  pkr_per_unit  numeric     NOT NULL CHECK (pkr_per_unit > 0),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE currency_rates IS 'Live FX rates keyed by ISO 4217 code. Refreshed daily by cron; see fn_request_currency_rates.';

-- One row. Records whether the last refresh actually worked, because a silently
-- stale rate table is worse than an obviously broken one.
CREATE TABLE currency_rate_sync (
  id            boolean     PRIMARY KEY DEFAULT true CHECK (id),
  request_id    bigint,
  requested_at  timestamptz,
  succeeded_at  timestamptz,
  last_error    text,
  rate_date     text
);

INSERT INTO currency_rate_sync (id) VALUES (true);

ALTER TABLE currency_rates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rate_sync ENABLE ROW LEVEL SECURITY;

-- Rates are reference data: anyone inside the company reads them, nobody writes
-- them by hand. The refresh functions are SECURITY DEFINER and bypass this.
CREATE POLICY p_currency_rates_select     ON currency_rates     FOR SELECT USING (is_internal());
CREATE POLICY p_currency_rate_sync_select ON currency_rate_sync FOR SELECT USING (is_internal());

-- ── Refresh, step 1: ask ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_request_currency_rates() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'net' AS $$
DECLARE v_id bigint;
BEGIN
  SELECT net.http_get(url := 'https://open.er-api.com/v6/latest/PKR', timeout_milliseconds := 20000)
    INTO v_id;
  UPDATE currency_rate_sync
     SET request_id = v_id, requested_at = now(), last_error = NULL
   WHERE id;
END;
$$;

-- ── Refresh, step 2: absorb ──────────────────────────────────────────────────
-- Upsert rather than replace: a code the feed drops for a day keeps its last
-- known rate instead of vanishing and taking a lead's conversion with it.
CREATE OR REPLACE FUNCTION fn_absorb_currency_rates() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'net' AS $$
DECLARE
  v_sync    currency_rate_sync;
  v_status  int;
  v_body    jsonb;
  v_count   int;
BEGIN
  SELECT * INTO v_sync FROM currency_rate_sync WHERE id;
  IF v_sync.request_id IS NULL THEN RETURN; END IF;

  SELECT status_code, content::jsonb INTO v_status, v_body
    FROM net._http_response WHERE id = v_sync.request_id;

  IF v_status IS NULL THEN
    RETURN;  -- still in flight; the next tick will find it
  END IF;

  IF v_status <> 200 OR v_body->>'result' <> 'success' THEN
    UPDATE currency_rate_sync
       SET last_error = format('HTTP %s: %s', v_status, coalesce(v_body->>'error-type', 'unexpected body'))
     WHERE id;
    RETURN;
  END IF;

  WITH incoming AS (
    SELECT key AS code, value::numeric AS units_per_pkr
      FROM jsonb_each_text(v_body->'rates')
     WHERE value::numeric > 0
  )
  INSERT INTO currency_rates (code, pkr_per_unit, updated_at)
  SELECT code, round(1 / units_per_pkr, 8), now() FROM incoming
  ON CONFLICT (code) DO UPDATE
    SET pkr_per_unit = excluded.pkr_per_unit, updated_at = excluded.updated_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE currency_rate_sync
     SET succeeded_at = now(),
         last_error   = NULL,
         rate_date    = v_body->>'time_last_update_utc'
   WHERE id;

  RAISE NOTICE 'currency_rates: % codes refreshed', v_count;
END;
$$;

-- The feed publishes once a day. Ask a little after midnight UTC, absorb five
-- minutes later — long enough for a 20s request that queued behind others.
SELECT cron.schedule('currency-rates-request', '10 0 * * *', $$SELECT fn_request_currency_rates();$$);
SELECT cron.schedule('currency-rates-absorb',  '15 0 * * *', $$SELECT fn_absorb_currency_rates();$$);

REVOKE ALL ON FUNCTION fn_request_currency_rates() FROM public;
REVOKE ALL ON FUNCTION fn_absorb_currency_rates()  FROM public;
