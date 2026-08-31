import type { ReactNode } from 'react'

export interface ImpactCount {
  label: string
  /** Undefined while the count is still being fetched; renders as 0. */
  value: number | undefined
}

interface ImpactSummaryProps {
  /** What is about to happen, and to what. Sits above the boxes. */
  lead: ReactNode
  /** Counts not in yet — the boxes give way to one quiet line rather than zeros. */
  loading?: boolean
  counts: ImpactCount[]
  /** What the numbers mean for the record afterwards. */
  note?: ReactNode
}

/**
 * The body of a confirmation that has consequences worth counting: a sentence,
 * a grid of small boxes holding the numbers, and a line saying what happens to
 * them.
 *
 * Written four times over — once per screen that deletes something — and now
 * once. The point of the boxes is that a number is read at a glance where a
 * sentence listing five of them is not, and that only works while every one of
 * these dialogs looks the same. A fifth copy is how that stops being true.
 */
export function ImpactSummary({ lead, loading = false, counts, note }: ImpactSummaryProps) {
  return (
    <div className="space-y-3">
      <p>{lead}</p>
      {loading ? (
        <p className="text-text-3">Checking linked records…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {counts.map((count) => (
            <div key={count.label} className="rounded-md border border-border-default bg-surface-2 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-4">{count.label}</p>
              <p className="font-display text-[18px] font-bold text-text-1">{count.value ?? 0}</p>
            </div>
          ))}
        </div>
      )}
      {note && <p className="text-text-3">{note}</p>}
    </div>
  )
}
