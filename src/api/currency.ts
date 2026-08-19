import { supabase } from '../lib/supabase'
import type { CurrencyRates } from '../lib/currency'

export interface CurrencyRateSnapshot {
  /** PKR per 1 unit, keyed by ISO 4217 code. */
  rates: CurrencyRates
  /** When the feed itself last published, as it words it. Null before the first refresh. */
  feedDate: string | null
  /** When we last stored a successful refresh. */
  syncedAt: string | null
  /** Set when the last scheduled refresh failed — the rates below are then the previous good ones. */
  error: string | null
  /**
   * Whether these rates can still be called "today's".
   *
   * Decided here rather than at render time: staleness needs to know the
   * current time, and reading the clock while rendering makes a component's
   * output depend on when React happened to run it. The query refetches hourly,
   * which is far more often than a daily feed can go stale.
   */
  stale: boolean
  staleReason: string | null
}

/** Three days — several missed refreshes, not one that ran late. */
const STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000

function freshness(syncedAt: string | null, error: string | null): { stale: boolean; staleReason: string | null } {
  if (error) return { stale: true, staleReason: 'the last rate refresh failed' }
  if (!syncedAt) return { stale: true, staleReason: 'rates have never been refreshed' }
  const age = Date.now() - new Date(syncedAt).getTime()
  return age > STALE_AFTER_MS
    ? { stale: true, staleReason: `rates last updated ${new Date(syncedAt).toLocaleDateString()}` }
    : { stale: false, staleReason: null }
}

/**
 * The rates the database holds.
 *
 * One shared table rather than a fetch per browser: two people pricing the same
 * deal a minute apart must stamp the same number on it, and the pipeline should
 * not stop working because a third-party API is unreachable from one desk.
 */
export async function fetchCurrencyRates(): Promise<CurrencyRateSnapshot> {
  const [ratesRes, syncRes] = await Promise.all([
    supabase.from('currency_rates').select('code, pkr_per_unit'),
    supabase.from('currency_rate_sync').select('rate_date, succeeded_at, last_error').maybeSingle(),
  ])

  if (ratesRes.error) throw ratesRes.error
  if (syncRes.error) throw syncRes.error

  const rates: CurrencyRates = {}
  for (const row of ratesRes.data ?? []) rates[row.code] = Number(row.pkr_per_unit)

  const syncedAt = syncRes.data?.succeeded_at ?? null
  const error = syncRes.data?.last_error ?? null

  return {
    rates,
    feedDate: syncRes.data?.rate_date ?? null,
    syncedAt,
    error,
    ...freshness(syncedAt, error),
  }
}
