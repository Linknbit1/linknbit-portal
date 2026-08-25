import { useCallback, useState } from 'react'

const STORAGE_KEY = 'nav.collapsedGroups'

/**
 * Which sidebar sections this person has folded shut.
 *
 * Kept in localStorage deliberately: it is a per-device view preference with no
 * auth or personal data in it, the same carve-out `useRecentEmoji` documents.
 * Per-device rather than on the profile is the right default too — someone on a
 * short laptop screen wants Delivery folded there and open on the desktop.
 *
 * Reads are wrapped because private-mode browsers throw on access rather than
 * returning null, and a sidebar that cannot render is a worse failure than a
 * sidebar that forgets.
 */
function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function useNavGroupCollapse() {
  const [collapsed, setCollapsed] = useState<string[]>(read)

  const toggle = useCallback((groupId: string) => {
    setCollapsed((prev) => {
      const next = prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* quota or private mode — non-critical */ }
      return next
    })
  }, [])

  const isCollapsed = useCallback((groupId: string) => collapsed.includes(groupId), [collapsed])

  return { isCollapsed, toggle }
}
