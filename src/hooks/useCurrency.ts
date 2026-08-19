import { useQuery } from '@tanstack/react-query'
import { fetchCurrencyRates, type CurrencyRateSnapshot } from '../api/currency'
import { FALLBACK_RATES, type CurrencyRates } from '../lib/currency'

export const CURRENCY_KEYS = {
  rates: ['currency', 'rates'] as const,
}

/**
 * Live FX rates.
 *
 * The feed publishes once a day and the cron job follows it, so there is nothing
 * to gain from refetching on every mount — an hour of staleness costs nothing
 * and saves a request on every screen that prices a deal.
 */
export function useCurrencyRateSnapshot() {
  return useQuery({
    queryKey: CURRENCY_KEYS.rates,
    queryFn: fetchCurrencyRates,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}

/**
 * Just the rates, with the bundled snapshot standing in until they arrive.
 *
 * Never returns an empty map: a form that rendered before the query resolved
 * would otherwise convert at a rate of 1 and quietly write a wrong PKR figure.
 */
export function useCurrencyRates(): CurrencyRates {
  const { data } = useCurrencyRateSnapshot()
  const live = data?.rates
  return live && Object.keys(live).length > 0 ? live : FALLBACK_RATES
}

export type { CurrencyRateSnapshot }

/**
 * Whether the rates can still be trusted as "today's", for a screen that prices
 * a deal. A refresh that quietly stopped working looks exactly like one that is
 * working, right up until someone notices a quote converted at last quarter's
 * rate. The judgement itself is made in the api layer — see fetchCurrencyRates.
 */
export function useRatesFreshness(): { stale: boolean; reason: string | null } {
  const { data } = useCurrencyRateSnapshot()
  return { stale: data?.stale ?? false, reason: data?.staleReason ?? null }
}
