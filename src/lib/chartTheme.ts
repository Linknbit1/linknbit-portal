/**
 * Shared Recharts styling for the dark portal.
 *
 * Recharts takes plain style objects rather than classes, so these are the one
 * place a raw hex is legitimate — they mirror the tokens in index.css
 * (`--color-text-4`, `--color-surface-1`) and must be updated alongside them.
 *
 * ReportsPage still carries its own copies; this exists so anything new agrees
 * with it rather than inventing a third set of greys.
 */

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#151515',
  border: '1px solid #272727',
  // Square, like every other surface in the theme.
  borderRadius: 0,
  color: '#F2F2F2',
  fontSize: 12,
  fontFamily: 'Poppins, sans-serif',
} as const

export const CHART_AXIS_TICK = {
  fontSize: 10,
  fill: '#5A5A5A',
  fontFamily: 'Poppins, sans-serif',
} as const

export const CHART_GRID_STROKE = 'rgba(255,255,255,0.04)'

export const CHART_LEGEND_STYLE = {
  fontSize: 11,
  fontFamily: 'Poppins, sans-serif',
  color: '#8A8A8A',
} as const

/** Series colours, matching the service and status accents used elsewhere. */
export const CHART_COLORS = {
  actual: '#22C55E',
  target: '#5A5A5A',
  design: '#A78BFA',
  dev: '#22D3EE',
  marketing: '#FBBF24',
  danger: '#F4364C',
  info: '#60A5FA',
} as const
