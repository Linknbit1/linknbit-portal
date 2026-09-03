import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Smoothly scroll the active tab to the horizontal center of its scroll container. */
function centerActiveTab(container: HTMLDivElement | null) {
  if (!container) return
  const active = container.querySelector<HTMLElement>('[aria-selected="true"]')
  if (!active) return
  const target = active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2
  const max = container.scrollWidth - container.clientWidth
  container.scrollTo({ left: Math.max(0, Math.min(target, max)), behavior: 'smooth' })
}

export interface Tab {
  key: string
  label: string
  badge?: number
}

interface TabsProps {
  tabs: Tab[]
  activeKey: string
  onChange: (key: string) => void
  variant?: 'underline' | 'pill'
  /**
   * `sm` matches the h-8 filter controls — a tab strip sitting in a toolbar
   * beside a Select and a search box reads as oversized at the page size.
   */
  size?: 'sm' | 'md'
  /**
   * Tabs divide the strip equally instead of sitting at their natural widths.
   * Only for a strip with a width of its own to divide — inside a `w-auto`
   * parent the zero-basis children would collapse it to nothing.
   */
  fill?: boolean
  className?: string
}

export function Tabs({ tabs, activeKey, onChange, variant = 'underline', size = 'md', fill = false, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the selected tab centered as the user moves through a scrollable strip.
  useEffect(() => { centerActiveTab(listRef.current) }, [activeKey])

  return (
    <div
      ref={listRef}
      className={cn(
        'flex items-center overflow-y-hidden scroll-smooth',
        // A filling strip has nothing to scroll: the tabs are already as wide as
        // the space allows, so the overflow machinery would only hide a tab.
        fill ? 'w-full' : 'overflow-x-auto touch-pan-x no-scrollbar',
        variant === 'underline' ? 'border-b border-border-default gap-1' : 'gap-1 bg-surface-inset rounded-md p-1',
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              'inline-flex items-center font-ui font-medium transition-colors duration-150 focus:outline-none whitespace-nowrap',
              fill ? 'min-w-0 flex-1 justify-center text-center' : 'shrink-0',
              size === 'sm' ? 'gap-1.5 text-[11.5px]' : 'gap-2 text-body-sm',
              variant === 'underline'
                ? cn(
                    'border-b-2 -mb-px',
                    size === 'sm' ? 'px-2.5 pb-2 pt-0.5' : 'px-3 pb-2.5 pt-1',
                    active
                      ? 'border-brand-red text-text-1'
                      : 'border-transparent text-text-3 hover:text-text-2',
                  )
                : cn(
                    'rounded-sm',
                    size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5',
                    active ? 'bg-surface-2 text-text-1' : 'text-text-3 hover:text-text-2',
                  ),
            )}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'rounded-sm font-bold',
                  size === 'sm' ? 'px-1 py-px text-[9.5px]' : 'px-1.5 py-0.5 text-[10px]',
                  active ? 'bg-brand-red text-white' : 'bg-surface-3 text-text-3',
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface TabPanelProps {
  children: ReactNode
  className?: string
}

export function TabPanel({ children, className }: TabPanelProps) {
  return <div className={cn('pt-4', className)}>{children}</div>
}
