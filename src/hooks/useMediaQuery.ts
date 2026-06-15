import { useEffect, useState } from 'react'

/**
 * Subscribe to a CSS media query. Use only when rendering (not just styling)
 * must differ between breakpoints — prefer Tailwind responsive classes otherwise.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** True at Tailwind's `lg` breakpoint (≥1024px) and up — the desktop/mobile cutoff. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
