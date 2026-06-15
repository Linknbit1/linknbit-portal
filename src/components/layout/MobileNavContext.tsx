import { createContext, useContext } from 'react'

interface MobileNavValue {
  openNav: () => void
}

export const MobileNavContext = createContext<MobileNavValue | null>(null)

/** Opener for the mobile nav drawer; null when rendered outside AppShell. */
export function useMobileNav(): MobileNavValue | null {
  return useContext(MobileNavContext)
}
