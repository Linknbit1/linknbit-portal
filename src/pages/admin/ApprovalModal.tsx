import { useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { ApprovalStatus } from '../../api/approvals'

interface ApprovalModalProps {
  title: string
  /** Context line, e.g. the stage/task name. */
  subject?: string
  pending?: boolean
  onSubmit: (status: ApprovalStatus, message: string) => void
  onClose: () => void
}

/** Reviewer decision dialog for a stage / task / file approval. */
export function ApprovalModal({ title, subject, pending, onSubmit, onClose }: ApprovalModalProps) {
  const [message, setMessage] = useState('')

  return (
    <Modal open onClose={onClose} title={title} size="sm" busy={pending}>
      <div className="p-5 space-y-4">
        {subject && <p className="font-ui text-[13px] text-text-2">{subject}</p>}
        <div className="flex flex-col gap-1.5">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Note (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Add a note for the record…"
            className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 font-ui text-body-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:border-border-focus focus:shadow-ring-focus resize-none"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" iconLeft={<Check size={14} />} disabled={pending} onClick={() => onSubmit('approved', message)}>Approve</Button>
          <Button variant="secondary" size="sm" iconLeft={<RotateCcw size={14} />} disabled={pending} onClick={() => onSubmit('revision_requested', message)}>Revise</Button>
          <Button variant="danger" size="sm" iconLeft={<X size={14} />} disabled={pending} onClick={() => onSubmit('rejected', message)}>Reject</Button>
        </div>
      </div>
    </Modal>
  )
}
