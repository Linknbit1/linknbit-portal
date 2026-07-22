import { createContext, useContext } from 'react'
import type { AttachmentRow } from '../../api/attachments'

export interface FileViewerContextValue {
  /** Open the viewer for an already-loaded attachment row. */
  openAttachment: (a: AttachmentRow) => void
  /** Open the viewer for an attachment id (resolved via the API; RLS-gated). */
  openAttachmentId: (id: string) => void
}

export const FileViewerContext = createContext<FileViewerContextValue | null>(null)

/** Available anywhere under FileViewerProvider; no-ops if the provider is absent. */
export function useFileViewer(): FileViewerContextValue {
  return useContext(FileViewerContext) ?? { openAttachment: () => {}, openAttachmentId: () => {} }
}
