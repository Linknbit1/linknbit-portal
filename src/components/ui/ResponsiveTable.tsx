import type { ReactNode } from 'react'

interface ResponsiveTableProps {
  /** Desktop grid/table markup, shown at lg and up. */
  desktop: ReactNode
  /** Mobile stacked-card markup, shown below lg. */
  mobile: ReactNode
}

/**
 * Renders a dense table on desktop and a stacked-card list on mobile from the
 * same data. Each caller supplies both representations.
 */
export function ResponsiveTable({ desktop, mobile }: ResponsiveTableProps) {
  return (
    <>
      <div className="hidden lg:block">{desktop}</div>
      <div className="lg:hidden flex flex-col gap-2.5">{mobile}</div>
    </>
  )
}
