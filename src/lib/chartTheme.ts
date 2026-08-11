/**
 * Shared Recharts styling for the dark portal.
 *
 * Recharts takes plain style objects rather than classes, so these are the one
 * place a raw hex is legitimate — they mirror the tokens in index.css
 * (`--color-text-4`, `--color-bg-canvas`) and must be updated alongside them.
 *
 * ReportsPage still carries its own copies; this exists so anything new agrees
 * with it rather than inventing a third set of greys.
 */

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#0F1620',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#E2E8F0',
  fontSize: 12,
  fontFamily: 'JetBrains Mono, monospace',
} as const

export const CHART_AXIS_TICK = {
  fontSize: 10,
  fill: '#4A5468',
  fontFamily: 'JetBrains Mono',
} as const

export const CHART_GRID_STROKE = 'rgba(255,255,255,0.04)'

export const CHART_LEGEND_STYLE = {
  fontSize: 11,
  fontFamily: 'JetBrains Mono',
  color: '#7A8597',
} as const

/** Series colours, matching the service and status accents used elsewhere. */
export const CHART_COLORS = {
  actual: '#22C55E',
  target: '#4A5468',
  design: '#A78BFA',
  dev: '#22D3EE',
  marketing: '#FBBF24',
  danger: '#F4364C',
  info: '#60A5FA',
} as const
