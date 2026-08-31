/**
 * A non-selectable divider inside a dropdown, naming the group of rows under it.
 *
 * Both pickers that use it answer the same question — "is this one already part
 * of the project, or will picking it add it?" — and a list that mixes the two
 * without saying so reads as one flat list where some rows quietly do more than
 * others. `aria-hidden` because the heading is decoration over a listbox whose
 * rows already carry their own names.
 */
export function OptionGroupHeading({ label }: { label: string }) {
  return (
    <div
      aria-hidden
      className="sticky top-0 z-1 border-b border-border-subtle bg-surface-2/95 px-3 py-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4 backdrop-blur-sm"
    >
      {label}
    </div>
  )
}
