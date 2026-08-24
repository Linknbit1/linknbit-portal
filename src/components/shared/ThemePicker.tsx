import { useState } from 'react'
import { Check, Loader2, Palette } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { useUpdateTheme } from '../../hooks/useProfile'
import { useToast } from '../ui/toast-context'
import { THEMES, DEFAULT_THEME, isThemeId, themeClass, type ThemeId } from '../../constants/themes'
import { cn } from '../../lib/cn'

/**
 * Personal colour-theme picker.
 *
 * The theme is one class on <html>, and every portal surface resolves its colour
 * through the variables that class redefines — so selecting here repaints the
 * sidebar, topbar, inputs, tables, modals, scrollbars and the page backdrop at
 * once, with no reload.
 *
 * The swap is applied to the document immediately and saved in the background:
 * a colour choice should feel instant, and there is nothing to lose if the write
 * fails — on error the previous class is put back and the toast says so.
 */
export function ThemePicker() {
  const { profile, refreshProfile } = useAuthContext()
  const { mutateAsync: saveTheme } = useUpdateTheme()
  const toast = useToast()

  const stored = isThemeId(profile?.theme) ? profile.theme : DEFAULT_THEME
  // Local state so the checkmark moves on click rather than on round-trip.
  const [selected, setSelected] = useState<ThemeId>(stored)
  const [saving, setSaving] = useState<ThemeId | null>(null)

  /** Swap the <html> class to `next`, removing whatever theme is on there now. */
  const applyToDocument = (next: ThemeId) => {
    const root = document.documentElement
    THEMES.forEach((t) => {
      const cls = themeClass(t.id)
      if (cls) root.classList.remove(cls)
    })
    const cls = themeClass(next)
    if (cls) root.classList.add(cls)
  }

  const choose = async (next: ThemeId) => {
    if (!profile || next === selected || saving) return
    const previous = selected

    setSelected(next)
    applyToDocument(next)
    setSaving(next)

    try {
      await saveTheme({ userId: profile.id, theme: next })
      // Re-read the profile so AppShell's own effect agrees with the document —
      // otherwise the next render of the shell would put the old class back.
      await refreshProfile()
    } catch {
      setSelected(previous)
      applyToDocument(previous)
      toast('Could not save your theme — put the previous one back', 'error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display font-bold text-[15px] text-text-1 flex items-center gap-2">
          <Palette size={15} className="text-text-3" /> Appearance
        </h2>
        <p className="text-body-sm font-ui text-text-3">
          Applies to your account only, on every device you sign in from.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Colour theme"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
      >
        {THEMES.map((theme) => {
          const active = selected === theme.id
          const pending = saving === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(theme.id)}
              disabled={!!saving}
              className={cn(
                'group flex flex-col gap-2.5 border p-2.5 text-left transition-colors',
                'focus-visible:outline-none focus-visible:border-border-focus',
                active
                  ? 'border-brand-red bg-brand-red/8'
                  : 'border-border-default bg-surface-inset hover:border-border-strong',
                saving && !pending && 'opacity-50',
              )}
            >
              {/* The swatch paints literal colours, not tokens: it has to show
                  the other themes while this one's variables are in force. */}
              <span
                className="relative flex h-14 w-full items-center justify-center border border-border-subtle"
                style={{ background: theme.swatch }}
              >
                {pending ? (
                  <Loader2 size={15} className="animate-spin text-white" />
                ) : active ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-white/95">
                    <Check size={12} strokeWidth={3} className="text-black" />
                  </span>
                ) : null}
              </span>

              <span className="flex flex-col gap-0.5">
                <span
                  className={cn(
                    'font-ui text-[13px] font-semibold',
                    active ? 'text-text-1' : 'text-text-2',
                  )}
                >
                  {theme.label}
                </span>
                <span className="font-ui text-[11.5px] leading-[1.45] text-text-3">
                  {theme.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
