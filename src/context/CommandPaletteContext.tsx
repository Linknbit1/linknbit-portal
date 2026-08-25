import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface CommandPaletteValue {
  open: boolean
  setOpen: (next: boolean) => void
}

const CommandPaletteContext = createContext<CommandPaletteValue | null>(null)

/**
 * Open/closed state for the command palette, lifted to context so the Topbar's
 * search box can open the same surface the ⌘K shortcut does. UI state only —
 * nothing here is fetched or persisted.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const value = useMemo(() => ({ open, setOpen }), [open])
  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>
}

/** A no-op stub outside the provider, so client-portal pages stay safe. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCommandPalette(): CommandPaletteValue {
  return useContext(CommandPaletteContext) ?? { open: false, setOpen: () => {} }
}
