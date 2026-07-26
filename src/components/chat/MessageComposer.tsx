import { useRef, useState, type DragEvent } from 'react'
import { type Editor, type JSONContent } from '@tiptap/react'
import { SendHorizonal, X, Paperclip, Smile } from 'lucide-react'
import { RichEditor } from '../editor/RichEditor'
import { EmojiPicker } from './EmojiPicker'
import { ChatAttachmentChips, type PendingUpload } from './ChatAttachmentChips'
import { useToast } from '../ui/toast-context'
import { cn } from '../../lib/cn'
import { docToPlainText, emptyDoc, isEmptyDoc, toDbDoc } from '../../lib/richText'
import { validateChatAttachmentFile } from '../../lib/chatAttachment'
import { useUploadChatAttachment } from '../../hooks/useMessageAttachments'
import type { PersonMini } from '../../api/projects'
import type { Json } from '../../types/database'

export interface ComposerPayload {
  bodyText: string
  bodyDoc: Json | null
  attachmentIds: string[]
}

interface MessageComposerProps {
  channelId: string
  mentionItems: PersonMini[]
  placeholder?: string
  editing?: { id: string; doc: JSONContent | null } | null
  onCancelEdit?: () => void
  onSend: (payload: ComposerPayload) => void
  onSaveEdit?: (payload: { bodyText: string; bodyDoc: Json | null }) => void
}

export function MessageComposer({
  channelId, mentionItems, placeholder, editing, onCancelEdit, onSend, onSaveEdit,
}: MessageComposerProps) {
  const toast = useToast()
  const [doc, setDoc] = useState<JSONContent>(editing?.doc ?? emptyDoc())
  // Remounts the editor to reset content — RichEditor deliberately never syncs
  // `value` back in while mounted.
  const [editorKey, setEditorKey] = useState(0)
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const { mutate: upload } = useUploadChatAttachment()

  const hasUploading = pending.some((p) => p.attachmentId === null && !p.error)

  const addFiles = (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const problem = validateChatAttachmentFile(file)
      if (problem) { toast(problem, 'error'); continue }

      const localId = crypto.randomUUID()
      setPending((prev) => [...prev, {
        localId, name: file.name, size: file.size, mimeType: file.type, progress: 0, attachmentId: null,
      }])

      upload(
        {
          file,
          channelId,
          onProgress: (progress) =>
            setPending((prev) => prev.map((p) => (p.localId === localId ? { ...p, progress } : p))),
        },
        {
          onSuccess: (row) =>
            setPending((prev) => prev.map((p) => (p.localId === localId ? { ...p, attachmentId: row.id, progress: 100 } : p))),
          onError: () =>
            setPending((prev) => prev.map((p) => (p.localId === localId ? { ...p, error: 'Upload failed' } : p))),
        },
      )
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  const reset = () => {
    setDoc(emptyDoc())
    setPending([])
    setEditorKey((k) => k + 1)
  }

  const submit = () => {
    const ready = pending.filter((p) => p.attachmentId).map((p) => p.attachmentId!)
    // A message can be attachments-only, but never completely empty.
    if (isEmptyDoc(doc) && ready.length === 0) return
    if (hasUploading) { toast('Wait for uploads to finish', 'warning'); return }

    const payload = { bodyText: docToPlainText(doc), bodyDoc: toDbDoc(doc) }
    if (editing && onSaveEdit) onSaveEdit(payload)
    else onSend({ ...payload, attachmentIds: ready })
    reset()
  }

  const insertEmoji = (char: string) => {
    editorRef.current?.chain().focus().insertContent(char).run()
  }

  return (
    <div
      className={cn(
        'border-t border-border-default bg-surface-1 px-3 py-2.5 transition-colors',
        dragOver && 'bg-brand-red/4',
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {editing && (
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-4">Editing message</span>
          <button
            onClick={() => { onCancelEdit?.(); reset() }}
            className="text-text-3 hover:text-text-1 transition-colors"
            aria-label="Cancel edit"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {!editing && (
        <ChatAttachmentChips
          pending={pending}
          onRemove={(localId) => setPending((prev) => prev.filter((p) => p.localId !== localId))}
        />
      )}

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 rounded-md border border-border-default bg-surface-inset py-2.5 pl-3.5 pr-2 text-[15px] transition-colors focus-within:border-border-focus">
          <RichEditor
            key={editorKey}
            value={doc}
            onChange={setDoc}
            onEditorReady={(editor) => { editorRef.current = editor }}
            mentionItems={mentionItems}
            placeholder={placeholder ?? 'Write a message…'}
            compact
            onSubmit={submit}
            autoFocus
          />

          <div className="flex items-center gap-0.5 mt-1">
            {!editing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach a file"
                title="Attach a file"
                className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-3 transition-colors"
              >
                <Paperclip size={15} />
              </button>
            )}
            <button
              ref={emojiBtnRef}
              onClick={() => setEmojiOpen((v) => !v)}
              aria-label="Insert emoji"
              title="Insert emoji"
              className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-3 transition-colors"
            >
              <Smile size={15} />
            </button>
          </div>
        </div>

        <button
          onClick={submit}
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-red text-white transition-colors hover:bg-brand-red-hover active:bg-brand-red-press"
        >
          <SendHorizonal size={17} />
        </button>
      </div>

      <p className="font-mono text-[10px] text-text-4 mt-1.5 px-1 hidden lg:block">
        Enter to send · Shift+Enter for a new line · @ to mention · drag files in to attach
      </p>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
      />

      <EmojiPicker
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        anchorRef={emojiBtnRef}
        onPick={insertEmoji}
      />
    </div>
  )
}
