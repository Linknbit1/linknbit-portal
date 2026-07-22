import { useCallback, type MouseEvent } from 'react'
import { useFileViewer } from '../shared/fileViewerContext'

/**
 * Delegated click handler for the wrapper around a TipTap editor/renderer: when a
 * `#`-tagged file chip (`.fileref[data-id]`) is clicked, open it in the in-app viewer.
 * Works in both editable and read-only editors because it listens at the DOM level.
 */
export function useFileRefClick() {
  const { openAttachmentId } = useFileViewer()
  return useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest('.fileref') as HTMLElement | null
    const id = el?.getAttribute('data-id')
    if (!id) return
    e.preventDefault()
    openAttachmentId(id)
  }, [openAttachmentId])
}
