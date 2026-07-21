import { useMemo, useRef, useState } from 'react'
import {
  Upload, Download, Trash2, Image as ImageIcon, FileText, FileSpreadsheet,
  FileArchive, Presentation, File as FileIcon, Loader2, FolderOpen, CheckSquare,
  Link2, Plus, Lock, ExternalLink, X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { validateAttachmentFile, formatFileSize, fileKind, type FileKind } from '../../lib/attachment'
import { getAttachmentUrl, type ProjectFile } from '../../api/attachments'
import {
  useProjectFiles, useUploadAttachment, useDeleteAttachment, useToggleAttachmentVisibility,
  useAddAttachmentLink, useSetAttachmentConfidential,
} from '../../hooks/useAttachments'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useToast } from '../../components/ui/toast-context'
import { ClientVisibility } from '../../components/shared/ClientVisibility'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ModalShell } from '../../components/ui/ModalShell'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'
import { formatRelativeTime } from '../../lib/utils'

const KIND_ICON: Record<FileKind, typeof FileIcon> = {
  image: ImageIcon, pdf: FileText, doc: FileText, sheet: FileSpreadsheet,
  slides: Presentation, archive: FileArchive, text: FileText, other: FileIcon,
}

/** Recognise the common Google Workspace URLs so links get a meaningful icon + label. */
function linkMeta(url: string): { icon: typeof FileIcon; label: string; tint: string } {
  if (/docs\.google\.com\/spreadsheets/.test(url)) return { icon: FileSpreadsheet, label: 'Google Sheet', tint: 'text-success' }
  if (/docs\.google\.com\/document/.test(url))     return { icon: FileText,        label: 'Google Doc',   tint: 'text-service-dev' }
  if (/docs\.google\.com\/presentation/.test(url)) return { icon: Presentation,    label: 'Google Slides', tint: 'text-service-mkt' }
  if (/drive\.google\.com/.test(url))              return { icon: FolderOpen,      label: 'Google Drive', tint: 'text-service-mkt' }
  return { icon: Link2, label: 'Link', tint: 'text-text-3' }
}

type Filter = 'all' | 'files' | 'links' | 'confidential'

interface ProjectFilesTabProps {
  projectId: string
  canManage?: boolean
  onOpenTask: (taskId: string) => void
}

export function ProjectFilesTab({ projectId, canManage = true, onOpenTask }: ProjectFilesTabProps) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ProjectFile | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const { data: files = [], isLoading } = useProjectFiles(projectId)
  const upload = useUploadAttachment()
  const remove = useDeleteAttachment()
  const toggleVisibility = useToggleAttachmentVisibility()
  const setConfidential = useSetAttachmentConfidential()
  // Confidential rows are filtered out server-side for anyone without this, so a
  // viewer never even receives them; this only drives the marking affordance.
  const canSeeConfidential = useCanAccess('can_view_confidential')

  const counts = useMemo(() => ({
    all: files.length,
    files: files.filter((f) => f.kind !== 'link').length,
    links: files.filter((f) => f.kind === 'link').length,
    confidential: files.filter((f) => f.is_confidential).length,
  }), [files])

  const shown = useMemo(() => files.filter((f) => (
    filter === 'all' ? true
      : filter === 'files' ? f.kind !== 'link'
      : filter === 'links' ? f.kind === 'link'
      : f.is_confidential
  )), [files, filter])

  const handleFiles = (list: FileList | null) => {
    if (!list?.length) return
    for (const file of Array.from(list)) {
      const error = validateAttachmentFile(file)
      if (error) { toast(`${file.name}: ${error}`, 'error'); continue }
      upload.mutate({ file, args: { projectId, taskId: null } }, {
        onSuccess: () => toast(`Uploaded ${file.name}`, 'success'),
        onError: (e) => toast(e instanceof Error ? e.message : 'Upload failed', 'error'),
      })
    }
  }

  const handleOpen = async (file: ProjectFile) => {
    if (file.kind === 'link') {
      if (file.link_url) window.open(file.link_url, '_blank', 'noopener,noreferrer')
      return
    }
    if (!file.storage_path) return
    try {
      setDownloadingId(file.id)
      const url = await getAttachmentUrl(file.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not open file', 'error')
    } finally { setDownloadingId(null) }
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'files', label: 'Files' },
    { key: 'links', label: 'Links' },
    ...(canSeeConfidential && counts.confidential > 0 ? [{ key: 'confidential' as Filter, label: 'Confidential' }] : []),
  ]

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors',
              dragOver ? 'border-brand-red bg-brand-red/5' : 'border-border-default hover:border-border-strong hover:bg-surface-2',
            )}
          >
            {upload.isPending ? <Loader2 size={18} className="animate-spin text-text-3" /> : <Upload size={18} className="text-text-3" />}
            <span className="font-ui text-[12.5px] text-text-2">{upload.isPending ? 'Uploading…' : 'Drop a file or click to upload'}</span>
            <span className="font-ui text-[10.5px] text-text-4">Max 25 MB</span>
            <input ref={inputRef} type="file" className="hidden" multiple onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
          </div>
          <button
            type="button"
            onClick={() => setLinkOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-default px-5 py-6 text-center transition-colors hover:border-border-strong hover:bg-surface-2 sm:w-52"
          >
            <Link2 size={18} className="text-text-3" />
            <span className="font-ui text-[12.5px] text-text-2">Add a document link</span>
            <span className="font-ui text-[10.5px] text-text-4">Google Doc, Sheet, Drive…</span>
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex items-center gap-1 self-start rounded-lg border border-border-default bg-surface-1 p-1 w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-sm px-3 py-1 font-ui text-[12px] font-medium transition-colors',
                filter === f.key ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1',
              )}
            >
              {f.label}
              <span className="ml-1.5 font-mono text-[10px] text-text-4">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-6 text-center font-ui text-[12px] text-text-4">Loading files…</div>
      ) : shown.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-default py-10 text-center font-ui text-[13px] text-text-4">
          {files.length === 0 ? 'No files or links yet' : 'Nothing matches this filter'}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((file) => {
            const isLink = file.kind === 'link'
            const meta = isLink ? linkMeta(file.link_url ?? '') : null
            const Icon = meta?.icon ?? KIND_ICON[fileKind(file.mime_type, file.file_name)]
            return (
              <li
                key={file.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border bg-surface-1 px-3 py-2.5 transition-colors hover:border-border-strong',
                  file.is_confidential ? 'border-warning/30 bg-warning/4' : 'border-border-default',
                )}
              >
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2', meta?.tint ?? 'text-text-3')}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-ui text-[13px] text-text-1">{file.file_name}</p>
                    {file.is_confidential && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-xs border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-warning">
                        <Lock size={9} /> Confidential
                      </span>
                    )}
                    {file.task ? (
                      <button
                        onClick={() => onOpenTask(file.task!.id)}
                        className="inline-flex max-w-50 items-center gap-1 rounded-xs border border-service-dev/25 bg-service-dev/10 px-1.5 py-0.5 font-ui text-[10px] font-semibold text-service-dev transition-colors hover:bg-service-dev/20"
                      >
                        <CheckSquare size={10} className="shrink-0" /> <span className="truncate">{file.task.title}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-xs border border-border-default bg-surface-2 px-1.5 py-0.5 font-ui text-[10px] font-semibold text-text-3">
                        <FolderOpen size={10} /> Project
                      </span>
                    )}
                  </div>
                  <p className="truncate font-mono text-[10.5px] text-text-4">
                    {isLink ? meta?.label : formatFileSize(file.file_size)}
                    {file.uploader ? ` · ${file.uploader.name}` : ''} · {formatRelativeTime(file.created_at)}
                  </p>
                </div>

                {canManage && canSeeConfidential && (
                  <button
                    onClick={() => setConfidential.mutate(
                      { id: file.id, isConfidential: !file.is_confidential },
                      { onError: () => toast('Could not change confidentiality', 'error') },
                    )}
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-sm transition-colors',
                      file.is_confidential ? 'text-warning hover:bg-warning/10' : 'text-text-4 hover:bg-surface-2 hover:text-text-2',
                    )}
                    title={file.is_confidential ? 'Marked confidential — click to unmark' : 'Mark as confidential'}
                    aria-label="Toggle confidential"
                  >
                    <Lock size={13} />
                  </button>
                )}
                {canManage && !file.is_confidential && (
                  <ClientVisibility visible={file.client_visible} onChange={(v) => toggleVisibility.mutate({ id: file.id, clientVisible: v, projectId, taskId: file.task_id })} />
                )}
                <button
                  onClick={() => handleOpen(file)}
                  disabled={downloadingId === file.id}
                  className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
                  aria-label={isLink ? 'Open link' : 'Download'}
                >
                  {downloadingId === file.id ? <Loader2 size={13} className="animate-spin" /> : isLink ? <ExternalLink size={13} /> : <Download size={13} />}
                </button>
                {canManage && (
                  <button onClick={() => setPendingDelete(file)} className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-3 transition-colors hover:bg-error/10 hover:text-error" aria-label="Delete"><Trash2 size={13} /></button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {linkOpen && (
        <AddLinkModal
          projectId={projectId}
          canMarkConfidential={canSeeConfidential}
          onClose={() => setLinkOpen(false)}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={pendingDelete?.kind === 'link' ? 'Remove link?' : 'Delete file?'}
        message={pendingDelete ? `"${pendingDelete.file_name}" will be permanently removed.` : ''}
        confirmLabel={pendingDelete?.kind === 'link' ? 'Remove' : 'Delete'}
        danger
        isPending={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          remove.mutate({ id: pendingDelete.id, storagePath: pendingDelete.storage_path, projectId, taskId: pendingDelete.task_id }, {
            onSuccess: () => { toast(pendingDelete.kind === 'link' ? 'Link removed' : 'File deleted', 'success'); setPendingDelete(null) },
            onError: (e) => toast(e instanceof Error ? e.message : 'Delete failed', 'error'),
          })
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

/* ── Add document link ─────────────────────────────────────────────────────── */
function AddLinkModal({ projectId, canMarkConfidential, onClose }: {
  projectId: string
  canMarkConfidential: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const addLink = useAddAttachmentLink()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [confidential, setConfidential] = useState(false)

  const trimmed = url.trim()
  const looksValid = /^https?:\/\/\S+$/i.test(trimmed)
  const meta = looksValid ? linkMeta(trimmed) : null
  const canSubmit = !!title.trim() && looksValid && !addLink.isPending

  const submit = () => {
    if (!canSubmit) return
    addLink.mutate(
      { projectId, title, url: trimmed, isConfidential: confidential },
      {
        onSuccess: () => { toast('Link added', 'success'); onClose() },
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not add link', 'error'),
      },
    )
  }

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="font-display text-[16px] font-bold text-text-1">Add document link</h3>
          <p className="mt-0.5 font-ui text-[11.5px] text-text-3">Link a Google Doc, Sheet, Slide deck, or any URL.</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-text-4 transition-colors hover:text-text-1"><X size={18} /></button>
      </div>

      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q3 Budget Sheet" />
        <div>
          <Input label="URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" />
          {trimmed && !looksValid && (
            <p className="mt-1 font-ui text-[11.5px] text-error">Enter a full URL starting with http:// or https://</p>
          )}
          {meta && (
            <p className={cn('mt-1.5 flex items-center gap-1.5 font-ui text-[11.5px]', meta.tint)}>
              <meta.icon size={12} /> Detected: {meta.label}
            </p>
          )}
        </div>

        {canMarkConfidential && (
          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border-default bg-surface-inset px-3.5 py-3">
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-ui text-[12.5px] font-medium text-text-1">
                <Lock size={12} className="text-warning" /> Confidential
              </span>
              <span className="mt-0.5 block font-ui text-[11px] text-text-4">
                Hidden from anyone without the “View Confidential Docs” permission, and never shown to clients.
              </span>
            </span>
            <Toggle checked={confidential} onChange={setConfidential} />
          </label>
        )}
      </div>

      <div className="mt-5 flex gap-2.5">
        <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="flex-1" disabled={!canSubmit} onClick={submit}>
          {addLink.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add link
        </Button>
      </div>
    </ModalShell>
  )
}
