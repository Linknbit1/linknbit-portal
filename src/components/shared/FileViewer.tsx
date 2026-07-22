import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download, ExternalLink, Loader2, Lock, FileText, FileSpreadsheet, Presentation,
  FileArchive, File as FileIcon, Link2, X,
} from 'lucide-react'
import { fetchAttachmentById, getAttachmentUrl, type AttachmentRow } from '../../api/attachments'
import { FileViewerContext } from './fileViewerContext'
import { previewMode, embeddableLinkUrl, fileKind, formatFileSize, type FileKind } from '../../lib/attachment'
import { ModalShell } from '../ui/ModalShell'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

const DOWNLOAD_ICON: Record<FileKind, typeof FileIcon> = {
  image: FileIcon, video: FileIcon, pdf: FileText, doc: FileText, sheet: FileSpreadsheet,
  slides: Presentation, archive: FileArchive, text: FileText, other: FileIcon,
}

export function FileViewerProvider({ children }: { children: ReactNode }) {
  const [row, setRow] = useState<AttachmentRow | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const openAttachment = useCallback((a: AttachmentRow) => { setPendingId(null); setRow(a) }, [])
  const openAttachmentId = useCallback((id: string) => { setRow(null); setPendingId(id) }, [])
  const close = useCallback(() => { setRow(null); setPendingId(null) }, [])

  const value = useMemo(() => ({ openAttachment, openAttachmentId }), [openAttachment, openAttachmentId])

  return (
    <FileViewerContext.Provider value={value}>
      {children}
      {(row || pendingId) && (
        <FileViewerModal row={row} pendingId={pendingId} onClose={close} />
      )}
    </FileViewerContext.Provider>
  )
}

function FileViewerModal({ row, pendingId, onClose }: {
  row: AttachmentRow | null
  pendingId: string | null
  onClose: () => void
}) {
  // Resolve by id when opened from a file-tag; RLS returns null if not permitted.
  const idQuery = useQuery({
    queryKey: ['attachment', pendingId],
    queryFn: () => fetchAttachmentById(pendingId ?? ''),
    enabled: !!pendingId,
    staleTime: 60_000,
  })
  const file = row ?? idQuery.data ?? null
  const resolving = !!pendingId && idQuery.isLoading

  return (
    <ModalShell onClose={onClose} size="xl" scroll={false} contentClassName="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {file?.kind === 'link' ? <Link2 size={15} className="shrink-0 text-text-3" /> : <FileIcon size={15} className="shrink-0 text-text-3" />}
          <p className="truncate font-ui text-[13px] font-semibold text-text-1">{file?.file_name ?? 'File'}</p>
          {file?.is_confidential && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-xs border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-warning">
              <Lock size={9} /> Confidential
            </span>
          )}
        </div>
        <button onClick={onClose} className="shrink-0 text-text-4 transition-colors hover:text-text-1"><X size={18} /></button>
      </div>

      <div className="min-h-[60vh] flex-1 bg-bg-base">
        {resolving ? (
          <Centered><Loader2 size={22} className="animate-spin text-text-3" /></Centered>
        ) : !file ? (
          <Centered>
            <div className="text-center">
              <Lock size={26} className="mx-auto mb-2 text-text-4" />
              <p className="font-ui text-[13px] text-text-2">This file isn’t available to you.</p>
              <p className="mt-1 font-ui text-[11.5px] text-text-4">It may be confidential or on a project you can’t access.</p>
            </div>
          </Centered>
        ) : (
          <ViewerBody file={file} onClose={onClose} />
        )}
      </div>
    </ModalShell>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-[60vh] items-center justify-center p-6">{children}</div>
}

function ViewerBody({ file, onClose }: { file: AttachmentRow; onClose: () => void }) {
  // ── External document link ──
  if (file.kind === 'link') {
    const embed = file.link_url ? embeddableLinkUrl(file.link_url) : null
    if (embed) {
      return <iframe title={file.file_name} src={embed} className="h-[74vh] w-full border-0 bg-white" allow="autoplay" />
    }
    return (
      <Centered>
        <OpenExternally url={file.link_url} label="Open link in a new tab" />
      </Centered>
    )
  }

  // ── Uploaded file: preview image/video/pdf via a signed URL ──
  const mode = previewMode(file.mime_type, file.file_name)
  return <UploadedViewer file={file} mode={mode} onClose={onClose} />
}

function UploadedViewer({ file, mode, onClose }: {
  file: AttachmentRow
  mode: ReturnType<typeof previewMode>
  onClose: () => void
}) {
  // A signed URL is only needed for the previewable kinds; download fetches its own.
  const urlQuery = useQuery({
    queryKey: ['attachment-url', file.id, file.storage_path],
    queryFn: () => getAttachmentUrl(file.storage_path ?? ''),
    enabled: mode !== 'download' && !!file.storage_path,
    staleTime: 30_000,
  })

  const download = async () => {
    if (!file.storage_path) return
    const url = await getAttachmentUrl(file.storage_path)
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  if (mode === 'download') {
    const Icon = DOWNLOAD_ICON[fileKind(file.mime_type, file.file_name)]
    return (
      <Centered>
        <div className="text-center">
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-xl bg-surface-2 text-text-3"><Icon size={26} /></span>
          <p className="font-ui text-[13px] text-text-1">{file.file_name}</p>
          <p className="mt-1 font-mono text-[11px] text-text-4">{formatFileSize(file.file_size)} · can’t preview this type</p>
          <Button size="sm" className="mt-4" onClick={download}><Download size={13} /> Download to view</Button>
        </div>
      </Centered>
    )
  }

  if (urlQuery.isLoading) return <Centered><Loader2 size={22} className="animate-spin text-text-3" /></Centered>
  if (urlQuery.isError || !urlQuery.data) {
    return <Centered><p className="font-ui text-[13px] text-error">Could not load this file.</p></Centered>
  }
  const url = urlQuery.data

  if (mode === 'image') {
    return (
      <div className="flex h-[74vh] items-center justify-center overflow-auto p-4">
        <img src={url} alt={file.file_name} className="max-h-full max-w-full rounded-md object-contain" />
      </div>
    )
  }
  if (mode === 'video') {
    return (
      <div className="flex h-[74vh] items-center justify-center bg-black p-2">
        <video src={url} controls className="max-h-full max-w-full" />
      </div>
    )
  }
  // pdf
  return <iframe title={file.file_name} src={url} className="h-[74vh] w-full border-0 bg-white" />
}

function OpenExternally({ url, label }: { url: string | null; label: string }) {
  if (!url) return <p className="font-ui text-[13px] text-text-4">This link is unavailable.</p>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-2 rounded-md border border-border-default bg-surface-2 px-4 py-2.5 font-ui text-[13px] text-text-1 transition-colors hover:border-border-strong')}
    >
      <ExternalLink size={14} /> {label}
    </a>
  )
}
