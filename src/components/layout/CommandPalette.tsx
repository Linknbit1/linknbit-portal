import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, FolderOpen, UserCog, CheckSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ModalShell } from '../ui/ModalShell'
import { useNavItems } from './navItems'
import { useProjects } from '../../hooks/useProjects'
import { usePeople } from '../../hooks/usePeople'
import { useTasks } from '../../hooks/useTasks'
import { useCommandPalette } from '../../context/CommandPaletteContext'

interface Command {
  id: string
  group: string
  label: string
  /** Second line — the context that tells two same-named things apart. */
  hint?: string
  icon: LucideIcon
  to: string
}

/**
 * How many of each group survive to the list — long lists defeat the point.
 * Destinations are uncapped: they are the reason the palette exists.
 */
const LIMITS: Record<string, number> = { Projects: 5, People: 5, Tasks: 6 }

/**
 * Ranks a match: 0 when the label starts with the query, 1 when a word does,
 * 2 for a match anywhere in the label, 3 when only the hint matched. Anything
 * unmatched returns null and is dropped.
 */
function score(command: Command, query: string): number | null {
  const label = command.label.toLowerCase()
  const hint = command.hint?.toLowerCase() ?? ''
  if (label.startsWith(query)) return 0
  if (label.split(/\s+/).some((word) => word.startsWith(query))) return 1
  if (label.includes(query)) return 2
  if (hint.includes(query)) return 3
  return null
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Mounted only while the palette is open, so none of these fire on app load.
  const navItems = useNavItems()
  const { data: projects = [] } = useProjects()
  const { data: people = [] } = usePeople()
  const { data: tasks = [] } = useTasks()

  const trimmed = query.trim().toLowerCase()

  /**
   * Destinations come from the same capability-filtered list the sidebar
   * renders, so the palette can never offer someone a screen their role cannot
   * open — no second permission rule to keep in sync.
   */
  const destinations = useMemo<Command[]>(
    () =>
      navItems.flatMap((item) => [
        { id: `nav:${item.to}`, group: 'Go to', label: item.label, icon: item.icon, to: item.to },
        ...(item.children ?? []).map((child) => ({
          id: `nav:${item.to}:${child.to}`,
          group: 'Go to',
          label: child.label,
          hint: item.label,
          icon: child.icon,
          to: child.to,
        })),
      ]),
    [navItems],
  )

  const entities = useMemo<Command[]>(() => {
    // Only searched, never listed: showing every project and person behind an
    // empty box would bury the destinations people open the palette for.
    if (!trimmed) return []
    return [
      ...projects.map((p) => ({
        id: `project:${p.id}`,
        group: 'Projects',
        label: p.name,
        hint: p.client?.name ?? undefined,
        icon: FolderOpen,
        to: `/projects/${p.id}`,
      })),
      ...people.map((p) => ({
        id: `person:${p.id}`,
        group: 'People',
        label: p.name,
        hint: p.job_title ?? undefined,
        icon: UserCog,
        to: `/members/${p.id}`,
      })),
      ...tasks.map((t) => ({
        id: `task:${t.id}`,
        group: 'Tasks',
        label: t.title,
        hint: t.project?.name ?? undefined,
        icon: CheckSquare,
        to: `/tasks/${t.id}`,
      })),
    ]
  }, [trimmed, projects, people, tasks])

  const results = useMemo<Command[]>(() => {
    const pool = [...destinations, ...entities]
    if (!trimmed) return destinations

    const ranked = pool
      .flatMap((command) => {
        const s = score(command, trimmed)
        return s === null ? [] : [{ command, s }]
      })
      .sort((a, b) => a.s - b.s || a.command.label.localeCompare(b.command.label))

    // Cap each entity group so one noisy match set cannot crowd out the others.
    const used: Record<string, number> = {}
    return ranked.flatMap(({ command }) => {
      const limit = LIMITS[command.group]
      if (limit == null) return [command]
      used[command.group] = (used[command.group] ?? 0) + 1
      return used[command.group] <= limit ? [command] : []
    })
  }, [destinations, entities, trimmed])

  // Clamped during render rather than corrected in an effect: a shrinking result
  // set would otherwise leave the highlight past the end of the list for one
  // render, and Enter would open whatever used to be there.
  const activeIndex = active >= results.length ? 0 : active

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function choose(command: Command | undefined) {
    if (!command) return
    navigate(command.to)
    onClose()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(results.length === 0 ? 0 : (activeIndex + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(results.length === 0 ? 0 : (activeIndex - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[activeIndex])
    }
  }

  // Group headings are rendered from the flat list, so the highlight index and
  // the visual order can never disagree.
  let lastGroup: string | null = null

  return (
    <ModalShell onClose={onClose} size="lg" scroll={false}>
      <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border-subtle shrink-0">
        <Search size={15} className="text-text-3 shrink-0" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Search screens, projects, people and tasks…"
          aria-label="Search the portal"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none font-ui text-[14px] text-text-1 placeholder:text-text-4"
        />
        <kbd className="font-mono text-[10px] text-text-4 border border-border-default rounded-sm px-1.5 py-0.5 shrink-0">
          Esc
        </kbd>
      </div>

      <div ref={listRef} className="max-h-96 overflow-y-auto py-1">
        {results.length === 0 ? (
          <p className="px-4 py-10 text-center font-ui text-[13px] text-text-4">
            Nothing matches “{query.trim()}”.
          </p>
        ) : (
          results.map((command, index) => {
            const Icon = command.icon
            const newGroup = command.group !== lastGroup
            lastGroup = command.group
            return (
              <div key={command.id}>
                {newGroup && (
                  <p className="px-4 pt-2.5 pb-1 font-mono text-[10px] uppercase tracking-wider text-text-4">
                    {command.group}
                  </p>
                )}
                <button
                  type="button"
                  data-active={index === activeIndex}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(command)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors',
                    index === activeIndex ? 'bg-brand-red/12' : 'hover:bg-surface-2',
                  )}
                >
                  <Icon
                    size={14}
                    className={cn('shrink-0', index === activeIndex ? 'text-brand-red' : 'text-text-3')}
                  />
                  <span className="font-ui text-[13px] text-text-1 truncate">{command.label}</span>
                  {command.hint && (
                    <span className="font-ui text-[11.5px] text-text-4 truncate">
                      {command.hint}
                    </span>
                  )}
                  {index === activeIndex && (
                    <CornerDownLeft size={12} className="ml-auto shrink-0 text-text-4" />
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>
    </ModalShell>
  )
}

/**
 * ⌘K / Ctrl-K search over every screen the signed-in user can open, plus their
 * projects, people and tasks.
 *
 * The dialog is a separate component mounted only while open: its queries live
 * inside it, so an always-mounted palette costs nothing until someone reaches
 * for it.
 */
export function CommandPalette() {
  const { open, setOpen } = useCommandPalette()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return open ? <PaletteDialog onClose={() => setOpen(false)} /> : null
}
