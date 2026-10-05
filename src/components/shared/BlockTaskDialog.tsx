import { useState } from 'react'
import { Ban } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select, type SelectOption } from '../ui/Select'
import { usePeople } from '../../hooks/usePeople'
import type { BlockDetails } from '../../api/tasks'

interface BlockFieldsProps {
  reason: string
  onReasonChange: (reason: string) => void
  blockedOnId: string
  onBlockedOnChange: (id: string) => void
  /** Show the "required" error under an empty reason. */
  showError: boolean
  onReasonBlur?: () => void
  /** Enter in the reason box, for the dialog's submit-on-Enter. */
  onSubmit?: () => void
  autoFocus?: boolean
}

/**
 * The reason and the person, shared by the dialog and the task form so the two
 * places that can block a task ask the same question the same way.
 */
export function BlockFields({
  reason, onReasonChange, blockedOnId, onBlockedOnChange, showError, onReasonBlur, onSubmit, autoFocus,
}: BlockFieldsProps) {
  const { data: people = [] } = usePeople()
  const options: SelectOption[] = [
    { value: '', label: 'Nobody in particular' },
    ...people.map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } })),
  ]
  // The list is active people only, so a blocker naming somebody who has since
  // left would otherwise read "Nobody in particular" and be cleared on save.
  if (blockedOnId && !people.some((p) => p.id === blockedOnId)) {
    options.push({ value: blockedOnId, label: 'Someone who has left', departed: true })
  }

  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor="blocked-reason" className="font-ui text-label font-semibold uppercase tracking-wider text-text-2">
          What is it blocked on? <span className="text-brand-red">*</span>
        </label>
        <textarea
          id="blocked-reason"
          autoFocus={autoFocus}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          onBlur={onReasonBlur}
          onKeyDown={(e) => {
            if (onSubmit && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() }
          }}
          placeholder="e.g. Waiting on the client's brand assets"
          aria-required
          aria-invalid={showError}
          className="w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2 font-ui text-body-sm text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
        />
        {showError && <p className="font-ui text-caption text-error">Say what the task is blocked on.</p>}
      </div>
      <div className="space-y-1.5">
        <label className="font-ui text-label font-semibold uppercase tracking-wider text-text-2">Waiting on</label>
        <Select value={blockedOnId} onChange={onBlockedOnChange} options={options} placeholder="Nobody in particular" />
        <p className="font-ui text-caption text-text-4">Who can unblock it, if that is a person. Some blockers are not somebody.</p>
      </div>
    </>
  )
}

interface BlockTaskDialogProps {
  open: boolean
  taskTitle: string
  /** Present when editing a blocker that is already recorded. */
  initial?: BlockDetails
  isPending: boolean
  onConfirm: (details: BlockDetails) => void
  onClose: () => void
}

/**
 * Asks what a task is stuck on before it moves to Blocked.
 *
 * The database refuses a Blocked task with no reason, so every way into that
 * status has to collect one first rather than finding out from the error.
 */
export function BlockTaskDialog(props: BlockTaskDialogProps) {
  if (!props.open) return null
  // Mounted fresh on each open, so one task's reason never carries over to the next.
  return <BlockTaskDialogBody {...props} />
}

function BlockTaskDialogBody({ taskTitle, initial, isPending, onConfirm, onClose }: BlockTaskDialogProps) {
  const [reason, setReason] = useState(initial?.reason ?? '')
  const [blockedOnId, setBlockedOnId] = useState(initial?.blockedOnId ?? '')
  const [touched, setTouched] = useState(false)
  const empty = reason.trim().length === 0

  const submit = () => {
    setTouched(true)
    if (empty || isPending) return
    onConfirm({ reason: reason.trim(), blockedOnId: blockedOnId || null })
  }

  return (
    <Modal
      open
      size="sm"
      busy={isPending}
      onClose={onClose}
      title={initial ? 'Edit blocker' : 'Mark as blocked'}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={submit}
            disabled={empty}
            loading={isPending}
            iconLeft={<Ban size={14} />}
          >
            {initial ? 'Save' : 'Mark blocked'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <p className="truncate font-ui text-[12.5px] text-text-3">
          <strong className="font-semibold text-text-1">{taskTitle}</strong>
        </p>
        <BlockFields
          reason={reason}
          onReasonChange={setReason}
          blockedOnId={blockedOnId}
          onBlockedOnChange={setBlockedOnId}
          showError={touched && empty}
          onReasonBlur={() => setTouched(true)}
          onSubmit={submit}
          autoFocus
        />
      </div>
    </Modal>
  )
}
