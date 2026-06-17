import { createContext, useContext } from 'react'

interface NavChromeValue {
  // True while the current screen shows a back affordance (a pushed/stack screen).
  // The mobile bottom tab bar hides itself in this state so users don't lose their
  // place by tapping a tab mid-drill-down (iOS hidesBottomBarWhenPushed).
  hasBack: boolean
  setHasBack: (value: boolean) => void
}

export const NavChromeContext = createContext<NavChromeValue | null>(null)

/** Mobile nav chrome state (back affordance ↔ bottom-bar visibility). Null outside AppShell. */
export function useNavChrome(): NavChromeValue | null {
  return useContext(NavChromeContext)
}
