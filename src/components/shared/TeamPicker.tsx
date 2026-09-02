import { Toggle } from '../ui/Toggle'

interface TeamPickerProps {
  teams: { id: string; name: string }[]
  value: string[]
  onChange: (ids: string[]) => void
}

/**
 * Multi-select team picker built from the shared Toggle primitive — there is no
 * native multiselect in this portal. Used when inviting someone and when editing
 * who they are on.
 */
export function TeamPicker({ teams, value, onChange }: TeamPickerProps) {
  if (teams.length === 0) {
    return <p className="rounded-md border border-dashed border-border-default bg-surface-inset px-3 py-2 font-mono text-[11px] text-text-4">No teams yet</p>
  }
  return (
    <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto rounded-md border border-border-default bg-surface-inset p-1.5">
      {teams.map((t) => {
        const checked = value.includes(t.id)
        return (
          <label key={t.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-surface-2">
            <span className="truncate font-ui text-[12.5px] text-text-2">{t.name}</span>
            <Toggle checked={checked} onChange={(v) => onChange(v ? [...value, t.id] : value.filter((x) => x !== t.id))} />
          </label>
        )
      })}
    </div>
  )
}
