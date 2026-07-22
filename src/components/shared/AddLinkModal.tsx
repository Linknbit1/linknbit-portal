import { useState } from 'react'
import { Plus, Lock, Loader2, X } from 'lucide-react'
import { useAddAttachmentLink } from '../../hooks/useAttachments'
import { useToast } from '../ui/toast-context'
import { ModalShell } from '../ui/ModalShell'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Toggle } from '../ui/Toggle'
import { linkMeta } from '../../lib/linkMeta'
import { cn } from '../../lib/cn'

interface AddLinkModalProps {
  projectId: string
  /** Attach the link to a specific task; omit for a project-level link. */
  taskId?: string | null
  /** Whether the "confidential" toggle is offered (needs can_view_confidential). */
  canMarkConfidential: boolean
  onClose: () => void
}

/** Attach an external document (Google Doc/Sheet/Slides, Drive, any URL). */
export function AddLinkModal({ projectId, taskId, canMarkConfidential, onClose }: AddLinkModalProps) {
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
      { projectId, taskId: taskId ?? null, title, url: trimmed, isConfidential: confidential },
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
                Hidden from staff without the “View Confidential Docs” permission.
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
