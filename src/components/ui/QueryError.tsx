import { AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/cn'

interface QueryErrorProps {
  /** Whatever TanStack Query handed back. Rendered as text, never trusted as JSX. */
  error: unknown
  /** What failed, in the reader's terms — "This report", "The roster". */
  label?: string
  className?: string
}

/**
 * A failed query is not an empty one.
 *
 * Every reporting screen in the portal used to fall straight from `isLoading` to
 * `rows.length === 0`, which meant a thrown RPC rendered as a calm statement
 * that there was nothing to show. The backlog drill-downs did exactly that for
 * their entire existence: the function raised 42702 on every single call, and
 * the page reported "Nobody recorded time on this project in this range" —
 * a sentence that is not merely unhelpful but false, and that reads as a finding
 * about the team rather than a fault in the code.
 *
 * The rule this component exists to enforce: a screen that cannot answer must
 * say so, and must not answer instead.
 */
export function QueryError({ error, label = 'This view', className }: QueryErrorProps) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-error/30 bg-error/8 px-4 py-10 text-center',
        className,
      )}
    >
      <AlertTriangle size={18} className="mx-auto mb-2 text-error" />
      <p className="font-ui text-[13px] font-medium text-error">{label} could not be loaded.</p>
      <p className="mx-auto mt-1.5 max-w-lg wrap-break-word font-mono text-[11px] text-text-3">
        {message}
      </p>
      <p className="mt-2 font-ui text-[12px] text-text-4">
        This is a fault, not an empty result — the figures you are looking for may well exist.
      </p>
    </div>
  )
}
