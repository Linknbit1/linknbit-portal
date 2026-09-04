import type { ReactNode } from 'react'

/** One labelled control inside a filters panel. Shared so every panel reads alike. */
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-text-4">{label}</span>
      {children}
    </div>
  )
}
