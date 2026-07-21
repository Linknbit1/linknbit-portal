import { useRef, useState } from 'react'
import {
  Upload, Download, Trash2, Image as ImageIcon, FileText, FileSpreadsheet,
  FileArchive, Presentation, File as FileIcon, Loader2,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { validateAttachmentFile, formatFileSize, fileKind, type FileKind } from '../../lib/attachment'
import { getAttachmentUrl, type AttachmentWithUploader } from '../../api/attachments'
import { useTaskAttachments, useProjectAttachments, useUploadAttachment, useDeleteAttachment, useToggleAttachmentVisibility } from '../../hooks/useAttachments'
import { useToast } from '../ui/toast-context'
import { ClientVisibility } from './ClientVisibility'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { formatRelativeTime } from '../../lib/utils'

const KIND_ICON: Record<FileKind, typeof FileIcon> = {
  image: ImageIcon,
  pdf: FileText,
  doc: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  archive: FileArchive,
  text: FileText,
  other: FileIcon,
}

interface AttachmentUploaderProps {
  projectId: string
  /** When set, files are scoped to this task; otherwise they're project-level files. */
  taskId?: string
  /** Whether the current user may upload / delete / toggle visibility. */
  canManage?: boolean
  className?: string
}

export function AttachmentUploader({ projectId, taskId, canManage = true, className }: AttachmentUploaderProps) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AttachmentWithUploader | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const taskQuery = useTaskAttachments(taskId)
  const projectQuery = useProjectAttachments(taskId ? undefined : projectId)
  const { data: files = [], isLoading } = taskId ? taskQuery : projectQuery

  const upload = useUploadAttachment()
  const remove = useDeleteAttachment()
  const toggleVisibility = useToggleAttachmentVisibility()

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
    // Link rows have no storage object — open the URL directly.
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
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 py-5 px-4 rounded-md border border-dashed cursor-pointer transition-colors text-center',
            dragOver ? 'border-brand-red bg-brand-red/5' : 'border-border-default hover:border-border-strong hover:bg-surface-2',
          )}
        >
          {upload.isPending
            ? <Loader2 size={18} className="text-text-3 animate-spin" />
            : <Upload size={18} className="text-text-3" />}
          <span className="font-ui text-[12px] text-text-2">
            {upload.isPending ? 'Uploading…' : 'Drop a file or click to upload'}
          </span>
          <span className="font-ui text-[10.5px] text-text-4">Max 25 MB</span>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="py-4 text-center font-ui text-[12px] text-text-4">Loading files…</div>
      ) : files.length === 0 ? (
        <div className="py-4 text-center font-ui text-[12px] text-text-4">No files yet</div>
      ) : (
        <ul className="space-y-1.5">
          {files.map((file) => {
            const Icon = KIND_ICON[fileKind(file.mime_type, file.file_name)]
            return (
              <li
                key={file.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md bg-surface-1 border border-border-default"
              >
                <span className="size-8 rounded-sm bg-surface-2 flex items-center justify-center text-text-3 shrink-0">
                  <Icon size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-[12.5px] text-text-1 truncate">{file.file_name}</p>
                  <p className="font-mono text-[10.5px] text-text-4">
                    {formatFileSize(file.file_size)}
                    {file.uploader ? ` · ${file.uploader.name}` : ''}
                    {` · ${formatRelativeTime(file.created_at)}`}
                  </p>
                </div>
                {canManage && (
                  <ClientVisibility
                    visible={file.client_visible}
                    onChange={(v) => toggleVisibility.mutate({ id: file.id, clientVisible: v, projectId, taskId: file.task_id })}
                  />
                )}
                <button
                  onClick={() => handleDownload(file)}
                  disabled={downloadingId === file.id}
                  className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors shrink-0"
                  aria-label="Download"
                >
                  {downloadingId === file.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                </button>
                {canManage && (
                  <button
                    onClick={() => setPendingDelete(file)}
                    className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-error hover:bg-error/10 transition-colors shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete file?"
        message={pendingDelete ? `"${pendingDelete.file_name}" will be permanently removed.` : ''}
        confirmLabel="Delete"
        danger
        isPending={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          remove.mutate(
            { id: pendingDelete.id, storagePath: pendingDelete.storage_path, projectId, taskId: pendingDelete.task_id },
            {
              onSuccess: () => { toast('File deleted', 'success'); setPendingDelete(null) },
              onError: (e) => toast(e instanceof Error ? e.message : 'Delete failed', 'error'),
            },
          )
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
