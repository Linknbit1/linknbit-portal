import { useRef, useState } from 'react'
import {
  Upload, Download, Trash2, Image as ImageIcon, FileText, FileSpreadsheet,
  FileArchive, Presentation, File as FileIcon, FileVideo, FileAudio, Loader2, Link2, Lock, Eye, ExternalLink,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { validateAttachmentFile, formatFileSize, fileKind, type FileKind } from '../../lib/attachment'
import { getAttachmentUrl, type AttachmentWithUploader } from '../../api/attachments'
import {
  useTaskAttachments, useProjectAttachments, useUploadAttachment, useDeleteAttachment,
  useToggleAttachmentVisibility, useSetAttachmentConfidential,
} from '../../hooks/useAttachments'
import { useCanViewConfidential } from '../../hooks/useRoleFlags'
import { useFileViewer } from './fileViewerContext'
import { AddLinkModal } from './AddLinkModal'
import { linkMeta } from '../../lib/linkMeta'
import { useToast } from '../ui/toast-context'
import { ClientVisibility } from './ClientVisibility'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatRelativeTime } from '../../lib/utils'
import { PersonLink } from './PersonLink'

const KIND_ICON: Record<FileKind, typeof FileIcon> = {
  image: ImageIcon, video: FileVideo, audio: FileAudio, pdf: FileText, doc: FileText, sheet: FileSpreadsheet,
  slides: Presentation, archive: FileArchive, text: FileText, other: FileIcon,
}

interface AttachmentUploaderProps {
  projectId: string
  /** When set, files are scoped to this task; otherwise they're project-level files. */
  taskId?: string
  /** Whether the current user may upload / add links / delete / toggle. */
  canManage?: boolean
  className?: string
}

export function AttachmentUploader({ projectId, taskId, canManage = true, className }: AttachmentUploaderProps) {
  const toast = useToast()
  const { openAttachment } = useFileViewer()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AttachmentWithUploader | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)

  const taskQuery = useTaskAttachments(taskId)
  const projectQuery = useProjectAttachments(taskId ? undefined : projectId)
  const { data: files = [], isLoading } = taskId ? taskQuery : projectQuery

  const upload = useUploadAttachment()
  const remove = useDeleteAttachment()
  const toggleVisibility = useToggleAttachmentVisibility()
  const setConfidential = useSetAttachmentConfidential()
  const canSeeConfidential = useCanViewConfidential('project')

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return
    for (const file of Array.from(fileList)) {
      const error = validateAttachmentFile(file)
      if (error) { toast(`${file.name}: ${error}`, 'error'); continue }
      upload.mutate(
        { file, args: { projectId, taskId: taskId ?? null } },
        {
          onSuccess: () => toast(`Uploaded ${file.name}`, 'success'),
          onError: (e) => toast(e instanceof Error ? e.message : 'Upload failed', 'error'),
        },
      )
    }
  }

  const handleDownload = async (file: AttachmentWithUploader) => {
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
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {canManage && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto]">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-5 text-center transition-colors',
              dragOver ? 'border-brand-red bg-brand-red/5' : 'border-border-default hover:border-border-strong hover:bg-surface-2',
            )}
          >
            {upload.isPending ? <Loader2 size={18} className="animate-spin text-text-3" /> : <Upload size={18} className="text-text-3" />}
            <span className="font-ui text-[12px] text-text-2">{upload.isPending ? 'Uploading…' : 'Drop a file or click to upload'}</span>
            <span className="font-ui text-[10.5px] text-text-4">Max 25 MB</span>
            <input ref={inputRef} type="file" className="hidden" multiple onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
          </div>
          <button
            type="button"
            onClick={() => setLinkOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border-default px-4 py-5 text-center transition-colors hover:border-border-strong hover:bg-surface-2 sm:w-44"
          >
            <Link2 size={18} className="text-text-3" />
            <span className="font-ui text-[12px] text-text-2">Add link</span>
            <span className="font-ui text-[10.5px] text-text-4">Google Doc, Drive…</span>
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-4 text-center font-ui text-[12px] text-text-4">Loading files…</div>
      ) : files.length === 0 ? (
        <div className="py-4 text-center font-ui text-[12px] text-text-4">No files or links yet</div>
      ) : (
        <ul className="space-y-1.5">
          {files.map((file) => {
            const isLink = file.kind === 'link'
            const meta = isLink ? linkMeta(file.link_url ?? '') : null
            const Icon = meta?.icon ?? KIND_ICON[fileKind(file.mime_type, file.file_name)]
            return (
              <li
                key={file.id}
                className={cn(
                  'flex items-center gap-3 rounded-md border bg-surface-1 px-3 py-2',
                  file.is_confidential ? 'border-warning/30 bg-warning/4' : 'border-border-default',
                )}
              >
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-sm bg-surface-2', meta?.tint ?? 'text-text-3')}>
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-ui text-[12.5px] text-text-1">{file.file_name}</p>
                    {file.is_confidential && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-xs border border-warning/30 bg-warning/10 px-1 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-warning">
                        <Lock size={8} /> Conf.
                      </span>
                    )}
                  </div>
                  <p className="truncate font-mono text-[10.5px] text-text-4">
                    {isLink ? meta?.label : formatFileSize(file.file_size)}
                    {file.uploader && <> · <PersonLink personId={file.uploader.id} className="hover:text-text-2">{file.uploader.name}</PersonLink></>}
                    {' · '}{formatRelativeTime(file.created_at)}
                  </p>
                </div>

                {canManage && canSeeConfidential && (
                  <button
                    onClick={() => setConfidential.mutate({ id: file.id, isConfidential: !file.is_confidential }, { onError: () => toast('Could not change confidentiality', 'error') })}
                    className={cn('flex size-7 shrink-0 items-center justify-center rounded-sm transition-colors',
                      file.is_confidential ? 'text-warning hover:bg-warning/10' : 'text-text-4 hover:bg-surface-2 hover:text-text-2')}
                    title={file.is_confidential ? 'Confidential — click to unmark' : 'Mark as confidential'}
                    aria-label="Toggle confidential"
                  >
                    <Lock size={13} />
                  </button>
                )}
                {/* Independent of confidential. */}
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
                  onClick={() => handleDownload(file)}
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
        <AddLinkModal projectId={projectId} taskId={taskId ?? null} canMarkConfidential={canSeeConfidential} onClose={() => setLinkOpen(false)} />
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
          remove.mutate(
            { id: pendingDelete.id, storagePath: pendingDelete.storage_path, projectId, taskId: pendingDelete.task_id },
            {
              onSuccess: () => { toast(pendingDelete.kind === 'link' ? 'Link removed' : 'File deleted', 'success'); setPendingDelete(null) },
              onError: (e) => toast(e instanceof Error ? e.message : 'Delete failed', 'error'),
            },
          )
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
