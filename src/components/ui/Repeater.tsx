import { Plus, Trash2 } from 'lucide-react'
import { Button } from './Button'

interface RepeaterRow {
  id: string
}

interface RepeaterProps<T extends RepeaterRow> {
  /** Labels the whole group, not the individual rows. */
  label: string
  /** One line under the label explaining what belongs here. */
  hint?: string
  addLabel: string
  rows: T[]
  onAdd: () => void
  onRemove: (id: string) => void
  renderRow: (row: T) => React.ReactNode
  /** Shown in place of the rows when there are none. */
  emptyHint?: string
}

/**
 * A list of repeated form rows, each removable, with one Add button underneath.
 *
 * Rows are keyed on a client-minted id rather than an index: keying on position
 * makes React reuse the input of the row *below* a deleted one, which shows up
 * as a row that refuses to disappear while its neighbour's text jumps around.
 */
export function Repeater<T extends RepeaterRow>({
  label, hint, addLabel, rows, onAdd, onRemove, renderRow, emptyHint,
}: RepeaterProps<T>) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 font-ui text-[12px] font-medium text-text-2">
        {label}
        {hint && <span className="ml-1.5 font-normal text-text-4">- {hint}</span>}
      </legend>

      {rows.length === 0 && emptyHint && (
        <p className="mb-2 font-ui text-[11.5px] text-text-4">{emptyHint}</p>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">{renderRow(row)}</div>
            <button
              type="button"
              onClick={() => onRemove(row.id)}
              aria-label={`Remove this ${label.replace(/s$/, '').toLowerCase()}`}
              className="mt-1 shrink-0 rounded-sm p-2 text-text-4 transition-colors hover:bg-error/10 hover:text-error"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <Button variant="ghost" size="sm" className="mt-2" onClick={onAdd} type="button">
        <Plus size={13} /> {addLabel}
      </Button>
    </fieldset>
  )
}
