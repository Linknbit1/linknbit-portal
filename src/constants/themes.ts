/**
 * Portal colour themes.
 *
 * A theme is a `:root.theme-<id>` block in `src/index.css` that redefines the
 * design-token variables it wants to move. Because every Tailwind utility in the
 * portal compiles to `var(--color-…)`, one class on <html> repaints the sidebar,
 * topbar, inputs, tables, modals, scrollbars and the page backdrop at once —
 * nothing is themed per component.
 *
 * This file is the registry the UI reads: it turns the stored `profiles.theme`
 * string into a class name and gives the picker its swatches. Adding a theme is
 * a CSS block plus an entry here — no component changes.
 *
 * `swatch` is only for the picker preview, so it is a literal gradient rather
 * than a token: it has to render the *other* theme's colours while the current
 * theme's variables are in force.
 */
export type ThemeId = 'default' | 'jade' | 'violet'

export interface ThemeOption {
  id: ThemeId
  label: string
  /** One line on what the theme reads as, shown under the label in the picker. */
  description: string
  /** Preview gradient for the picker chip — literal colours, see note above. */
  swatch: string
}

export const THEMES: ThemeOption[] = [
  {
    id: 'default',
    label: 'Crimson',
    description: 'The Linknbit 3.0 default — near-black with a red wash.',
    swatch: 'linear-gradient(135deg, #0A0A0A 0%, #1D1D1D 55%, #E01414 100%)',
  },
  {
    id: 'jade',
    label: 'Jade',
    description: 'The same ladder rotated to deep teal.',
    swatch: 'linear-gradient(135deg, #07100E 0%, #172C27 55%, #14B8A6 100%)',
  },
  {
    id: 'violet',
    label: 'Violet',
    description: 'Indigo base under a violet-to-magenta gradient backdrop.',
    swatch: 'linear-gradient(135deg, #0A0812 0%, #1E182F 45%, #8B5CF6 78%, #D946EF 100%)',
  },
]

/**
 * The theme applied when `profiles.theme` is empty or unrecognised. The id is
 * `default` rather than `crimson` because that is the string the column has
 * defaulted to since it was created — renaming it would need a data migration
 * for no gain, so the id stays and only the label reads as the colour.
 */
export const DEFAULT_THEME: ThemeId = 'default'

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEMES.some((t) => t.id === value)
}

/**
 * The <html> class for a stored theme value, or `null` for the default — which
 * needs no class because its values are the ones `@theme` already emits.
 */
export function themeClass(value: string | null | undefined): string | null {
  if (!isThemeId(value) || value === DEFAULT_THEME) return null
  return `theme-${value}`
}
