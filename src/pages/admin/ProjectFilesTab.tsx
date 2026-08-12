import { useMemo, useRef, useState } from 'react'
import {
  Upload, Download, Trash2, Image as ImageIcon, FileText, FileSpreadsheet,
  FileArchive, Presentation, File as FileIcon, Loader2, FolderOpen, CheckSquare,
  Link2, Lock, ExternalLink, Eye, FileVideo, FileAudio,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { validateAttachmentFile, formatFileSize, fileKind, type FileKind } from '../../lib/attachment'
import { getAttachmentUrl, type ProjectFile } from '../../api/attachments'
import {
  useProjectFiles, useUploadAttachment, useDeleteAttachment, useToggleAttachmentVisibility,
  useSetAttachmentConfidential,
} from '../../hooks/useAttachments'
import { useCanViewConfidential } from '../../hooks/useRoleFlags'
import { useFileViewer } from '../../components/shared/fileViewerContext'
import { AddLinkModal } from '../../components/shared/AddLinkModal'
import { linkMeta } from '../../lib/linkMeta'
import { useToast } from '../../components/ui/toast-context'
import { ClientVisibility } from '../../components/shared/ClientVisibility'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { formatRelativeTime } from '../../lib/utils'
import { PersonLink } from '../../components/shared/PersonLink'

const KIND_ICON: Record<FileKind, typeof FileIcon> = {
  image: ImageIcon, video: FileVideo, audio: FileAudio, pdf: FileText, doc: FileText, sheet: FileSpreadsheet,
  slides: Presentation, archive: FileArchive, text: FileText, other: FileIcon,
}

type Filter = 'all' | 'files' | 'links' | 'confidential'

interface ProjectFilesTabProps {
  projectId: string
  canManage?: boolean
  onOpenTask: (taskId: string) => void
}

export function ProjectFilesTab({ projectId, canManage = true, onOpenTask }: ProjectFilesTabProps) {
  const toast = useToast()
  const { openAttachment } = useFileViewer()
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
  const canSeeConfidential = useCanViewConfidential('project')

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
                  {/* What the uploader said it is — the filename rarely says. */}
                  {file.description && (
                    <p className="truncate font-ui text-[11.5px] text-text-3">{file.description}</p>
                  )}
                  <p className="truncate font-mono text-[10.5px] text-text-4">
                    {isLink ? meta?.label : formatFileSize(file.file_size)}
                    {file.uploader && <> · <PersonLink personId={file.uploader.id} className="hover:text-text-2">{file.uploader.name}</PersonLink></>}
                    {' · '}{formatRelativeTime(file.created_at)}
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
                {/* Client visibility is independent of confidential — always available. */}
                {canManage && (
                  <ClientVisibility visible={file.client_visible} onChange={(v) => toggleVisibility.mutate({ id: file.id, clientVisible: v, projectId, taskId: file.task_id })} />
                )}
                <button
                  onClick={() => openAttachment(file)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
                  aria-label="Preview"
                >
                  <Eye size={13} />
                </button>
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

