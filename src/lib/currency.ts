// Currency for deal values.
//
// A lead's `value` is always PKR — it is what the funnel, the channel report and
// every target actual sum, and summing mixed currencies produces a number that
// means nothing. What the rep actually typed is kept beside it (`valueEntered` +
// `valueCurrency`) together with the rate used, so a quote of $1,550 still reads
// as $1,550 on the card a year later even after the rate has moved.

/**
 * PKR per 1 unit, from open.er-api.com on Wed, 19 Aug 2026 00:02:31 +0000.
 *
 * A snapshot, not a feed: the rate that matters is the one stamped on the lead
 * when its value was entered, and that is stored per row. Refresh this table
 * when it drifts far enough to bother you — old leads keep their own rate and
 * do not move.
 */
export const PKR_PER_UNIT: Record<string, number> = {
  PKR: 1,
  USD: 277.777778,
  GBP: 375.798572,
  EUR: 321.440051,
  AED: 75.620085,
  SAR: 74.057617,
  CAD: 199.960008,
  AUD: 196.927924,
  SGD: 217.296827,
  DKK: 42.995958,

  AFN: 4.238042,
  ALL: 3.46558,
  AMD: 0.759506,
  ANG: 155.159038,
  AOA: 0.301999,
  ARS: 0.185875,
  AWG: 155.159038,
  AZN: 163.345312,
  BAM: 164.365549,
  BBD: 138.869601,
  BDT: 2.2725,
  BGN: 164.365549,
  BHD: 738.552437,
  BIF: 0.093128,
  BMD: 277.700639,
  BND: 217.24962,
  BOB: 23.933179,
  BRL: 53.296381,
  BSD: 277.700639,
  BTN: 2.902058,
  BWP: 20.623659,
  BYN: 91.349228,
  BZD: 138.869601,
  CDF: 0.121163,
  CHF: 341.880342,
  CLF: 12048.192771,
  CLP: 0.303498,
  CNH: 41.172596,
  CNY: 41.192948,
  COP: 0.088593,
  CRC: 0.617809,
  CUP: 11.571663,
  CVE: 2.915324,
  CZK: 13.293276,
  DJF: 1.562676,
  DOP: 4.724447,
  DZD: 2.08743,
  EGP: 5.501064,
  ERN: 18.514747,
  ETB: 1.728683,
  FJD: 125.833648,
  FKP: 375.798572,
  FOK: 42.995958,
  GEL: 106.484932,
  GGP: 375.798572,
  GHS: 25.226407,
  GIP: 375.798572,
  GMD: 3.718882,
  GNF: 0.031647,
  GTQ: 36.3954,
  GYD: 1.327346,
  HKD: 35.409511,
  HNL: 10.356577,
  HRK: 42.665756,
  HTG: 2.123021,
  HUF: 0.881003,
  IDR: 0.015535,
  ILS: 92.919532,
  IMP: 375.798572,
  INR: 2.902058,
  IQD: 0.211586,
  IRR: 0.000202,
  ISK: 2.260858,
  JEP: 375.798572,
  JMD: 1.754555,
  JOD: 391.696044,
  JPY: 1.740187,
  KES: 2.144073,
  KGS: 3.174573,
  KHR: 0.068716,
  KID: 196.889151,
  KMF: 0.653413,
  KRW: 0.196657,
  KWD: 900.900901,
  KYD: 333.222259,
  KZT: 0.60118,
  LAK: 0.012435,
  LBP: 0.003103,
  LKR: 0.836679,
  LRD: 1.529585,
  LSL: 17.092264,
  LYD: 43.723493,
  MAD: 29.851637,
  MDL: 16.165274,
  MGA: 0.064203,
  MKD: 5.2176,
  MMK: 0.132165,
  MNT: 0.076658,
  MOP: 34.376074,
  MRU: 6.915151,
  MUR: 5.911353,
  MVR: 17.962028,
  MWK: 0.160043,
  MXN: 16.280811,
  MYR: 68.432218,
  MZN: 4.366069,
  NAD: 17.092264,
  NGN: 0.205403,
  NIO: 7.545461,
  NOK: 29.513325,
  NPR: 1.813786,
  NZD: 163.212012,
  OMR: 722.543353,
  PAB: 277.700639,
  PEN: 82.413054,
  PGK: 62.640942,
  PHP: 4.497778,
  PLN: 74.36603,
  PYG: 0.046079,
  QAR: 76.295109,
  RON: 61.327119,
  RSD: 2.738676,
  RUB: 3.264272,
  RWF: 0.188969,
  SBD: 34.729458,
  SCR: 19.254096,
  SDG: 0.618139,
  SEK: 29.139227,
  SHP: 375.798572,
  SLE: 11.291015,
  SLL: 0.011291,
  SOS: 0.485555,
  SRD: 7.347377,
  SSP: 0.054776,
  STN: 13.120777,
  SYP: 2.281345,
  SZL: 17.092264,
  THB: 8.389684,
  TJS: 30.178658,
  TMT: 79.592486,
  TND: 95.147479,
  TOP: 115.821172,
  TRY: 5.796026,
  TTD: 40.973531,
  TVD: 196.889151,
  TWD: 8.710194,
  TZS: 0.104884,
  UAH: 6.197169,
  UGX: 0.075045,
  UYU: 6.906602,
  UZS: 0.023505,
  VES: 0.359131,
  VND: 0.010636,
  VUV: 2.348592,
  WST: 102.280863,
  XAF: 0.49006,
  XCD: 102.859494,
  XCG: 155.159038,
  XDR: 379.794911,
  XOF: 0.49006,
  XPF: 2.693813,
  YER: 1.171044,
  ZAR: 17.093433,
  ZMW: 14.749915,
  ZWG: 10.400092,
  ZWL: 10.400092,
}

/** Offered at the top of the picker — the currencies this agency is actually quoted in. */
export const COMMON_CURRENCIES = ["PKR", "USD", "GBP", "EUR", "AED", "SAR", "CAD", "AUD", "SGD", "DKK"]

/** Every currency we hold a rate for, commons first, then the rest alphabetically. */
export const CURRENCY_CODES: string[] = [
  ...COMMON_CURRENCIES,
  ...Object.keys(PKR_PER_UNIT).filter((c) => !COMMON_CURRENCIES.includes(c)).sort(),
]

/** True when we can convert this code — the picker only ever offers these. */
export function isSupportedCurrency(code: string): boolean {
  return code in PKR_PER_UNIT
}

/**
 * The rate to stamp on a lead priced in `code`.
 *
 * Falls back to 1 for a code we do not know, which makes the amount its own PKR
 * value rather than silently zeroing a deal.
 */
export function pkrRate(code: string): number {
  return PKR_PER_UNIT[code] ?? 1
}

/** Convert an entered amount to the PKR figure the reports add up. */
export function toPkr(amount: number, code: string): number {
  return Math.round(amount * pkrRate(code))
}

/**
 * `USD 1,550` — code rather than symbol on purpose: $ is eleven different
 * currencies, and a pipeline that mixes them has to say which.
 */
export function formatMoney(amount: number, code = 'PKR'): string {
  return `${code} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`
}

/** The label a currency gets in the picker: `USD — US Dollar` where the browser knows the name. */
export function currencyLabel(code: string): string {
  const name = new Intl.DisplayNames(['en'], { type: 'currency' }).of(code)
  return name && name !== code ? `${code} — ${name}` : code
}
