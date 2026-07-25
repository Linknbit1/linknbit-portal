import { useCallback, useState } from 'react'
import { QUICK_REACTIONS } from '../components/chat/emojiData'

const STORAGE_KEY = 'chat:recentEmoji'
const MAX_RECENT = 16

/**
 * Recently-used emoji. Kept in localStorage deliberately: it's a per-device UI
 * preference with no privacy weight (just emoji characters) — not user data, so
 * the "no sensitive data in localStorage" rule doesn't apply.
 */
function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function useRecentEmoji() {
  const [recent, setRecent] = useState<string[]>(read)

  const push = useCallback((char: string) => {
    setRecent((prev) => {
      const next = [char, ...prev.filter((c) => c !== char)].slice(0, MAX_RECENT)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* quota or private mode — non-critical */ }
      return next
    })
  }, [])

  return { recent: recent.length > 0 ? recent : QUICK_REACTIONS, pushRecent: push }
}
