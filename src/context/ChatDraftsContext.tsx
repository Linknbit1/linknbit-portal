import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { JSONContent } from '@tiptap/react'

export interface ChatDraft {
  /** The editor document, so re-opening the conversation restores formatting. */
  doc: JSONContent
  /** Its plain text, which is what the conversation list shows. */
  text: string
}

interface ChatDraftsValue {
  drafts: Readonly<Record<string, ChatDraft>>
  setDraft: (channelId: string, draft: ChatDraft) => void
  clearDraft: (channelId: string) => void
}

const ChatDraftsContext = createContext<ChatDraftsValue | null>(null)

/** Rest-destructuring the key out reads better but leaves an unused binding. */
function omit(drafts: Record<string, ChatDraft>, channelId: string): Record<string, ChatDraft> {
  const next = { ...drafts }
  delete next[channelId]
  return next
}

/**
 * Unsent message text, per conversation, for as long as the app is open.
 *
 * Held in memory rather than in localStorage on purpose. A draft is somebody's
 * unsent words — often the most sensitive thing in the app — and the storage
 * rule that keeps sessions and profiles out of localStorage applies to it for
 * the same reason: anything left there outlives the session and the person.
 * The cost is that a hard refresh loses the draft; switching conversations,
 * which is what the feature is for, keeps it.
 */
export function ChatDraftsProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, ChatDraft>>({})

  const setDraft = useCallback((channelId: string, draft: ChatDraft) => {
    setDrafts((prev) => {
      // An emptied composer is not a draft — it is a conversation with nothing
      // pending, and leaving a "Draft:" label on it would be a lie.
      if (!draft.text.trim()) {
        if (!(channelId in prev)) return prev
        return omit(prev, channelId)
      }
      const current = prev[channelId]
      if (current?.text === draft.text) return prev
      return { ...prev, [channelId]: draft }
    })
  }, [])

  const clearDraft = useCallback((channelId: string) => {
    setDrafts((prev) => {
      if (!(channelId in prev)) return prev
      return omit(prev, channelId)
    })
  }, [])

  const value = useMemo(() => ({ drafts, setDraft, clearDraft }), [drafts, setDraft, clearDraft])

  return <ChatDraftsContext.Provider value={value}>{children}</ChatDraftsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChatDrafts(): ChatDraftsValue {
  const ctx = useContext(ChatDraftsContext)
  if (!ctx) throw new Error('useChatDrafts must be used inside ChatDraftsProvider')
  return ctx
}
