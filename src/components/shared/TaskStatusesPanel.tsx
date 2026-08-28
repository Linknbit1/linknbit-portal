import { useState } from 'react'
import { Eye, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToast } from '../ui/toast-context'
import {
  useTaskStatuses, useCreateTaskStatus, useUpdateTaskStatus, useDeleteTaskStatus, useSetReviewStatus,
} from '../../hooks/useTaskStatuses'
import type { TaskStatusRow } from '../../api/taskStatuses'

/** A key is what tasks store, so it has to be stable and URL-safe. */
const toKey = (label: string) =>
  label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)

/**
 * The board's columns, as data.
 *
 * Statuses used to be seven literals in a CHECK constraint, renameable but not
 * addable. They are rows now, so a team can run the board it actually works to.
 *
 * The important control is "Notifies reviewers": exactly one column can hold it,
 * and dropping a card there is what tells the task's reviewers. Marking it means
 * the behaviour follows the column rather than the word "review", so a column
 * called QA or Client sign-off works the same.
 */
export function TaskStatusesPanel({ canManage }: { canManage: boolean }) {
  const toast = useToast()
  const { data: statuses = [], isLoading } = useTaskStatuses()
  const create = useCreateTaskStatus()
  const update = useUpdateTaskStatus()
  const remove = useDeleteTaskStatus()
  const setReview = useSetReviewStatus()

  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#7A8597')
  const [pendingDelete, setPendingDelete] = useState<TaskStatusRow | null>(null)

  const fail = (e: unknown) => toast(e instanceof Error ? e.message : 'Could not save that', 'error')

  const add = () => {
    const key = toKey(newLabel)
    if (key.length < 2) { toast('Give the column a name', 'error'); return }
    if (statuses.some((s) => s.key === key)) { toast('There is already a column with that name', 'error'); return }
    create.mutate(
      {
        key,
        label: newLabel.trim(),
        color: newColor,
        sort_order: Math.max(0, ...statuses.map((s) => s.sort_order)) + 1,
      },
      { onSuccess: () => { setNewLabel(''); toast('Column added', 'success') }, onError: fail },
    )
  }

  if (isLoading) {
    return <div className="flex justify-center py-10 text-text-4"><Loader2 size={18} className="animate-spin" /></div>
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-[16px] font-bold text-text-1">Task statuses</h2>
      <p className="mb-5 font-ui text-[13px] text-text-3">
        The columns on every task board, in order. Rename them, recolour them, add your own.
        One column can be marked as the one that notifies a task&rsquo;s reviewers when a card lands in it.
      </p>

      <div className="divide-y divide-border-subtle border border-border-default bg-surface-1">
        {statuses.map((s) => (
          <div key={s.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <input
              type="color"
              value={s.color}
              disabled={!canManage}
              onChange={(e) => update.mutate({ key: s.key, updates: { color: e.target.value } }, { onError: fail })}
              aria-label={`Colour for ${s.label}`}
              className="size-7 shrink-0 cursor-pointer rounded-sm border border-border-default bg-transparent disabled:cursor-not-allowed"
            />
            <Input
              value={s.label}
              disabled={!canManage}
              onChange={(e) => update.mutate({ key: s.key, updates: { label: e.target.value } }, { onError: fail })}
              className="w-full sm:w-52"
            />
            <span className="font-mono text-[10.5px] text-text-4">{s.key}</span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!canManage}
                onClick={() => setReview.mutate(s.is_review ? null : s.key, { onError: fail })}
                title="Dropping a card here notifies the task's reviewers"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-ui text-[11.5px] font-semibold transition-colors disabled:opacity-50',
                  s.is_review
                    ? 'border-brand-red/35 bg-brand-red/12 text-brand-red'
                    : 'border-border-default bg-surface-2 text-text-3 hover:text-text-1',
                )}
              >
                <Eye size={12} />
                {s.is_review ? 'Notifies reviewers' : 'Not the review column'}
              </button>

              <label className="flex items-center gap-1.5 font-ui text-[11.5px] text-text-3">
                <input
                  type="checkbox"
                  checked={s.is_signoff}
                  disabled={!canManage}
                  onChange={(e) => update.mutate({ key: s.key, updates: { is_signoff: e.target.checked } }, { onError: fail })}
                />
                Sign-off
              </label>
              <label className="flex items-center gap-1.5 font-ui text-[11.5px] text-text-3">
                <input
                  type="checkbox"
                  checked={s.is_done}
                  disabled={!canManage}
                  onChange={(e) => update.mutate({ key: s.key, updates: { is_done: e.target.checked } }, { onError: fail })}
                />
                Finished
              </label>

              {canManage && !s.is_default && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(s)}
                  aria-label={`Delete ${s.label}`}
                  className="flex size-7 items-center justify-center rounded-sm text-text-4 hover:bg-error/10 hover:text-error"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canManage && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            aria-label="Colour for the new column"
            className="size-9 cursor-pointer rounded-sm border border-border-default bg-transparent"
          />
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New column, e.g. QA"
            className="w-full sm:w-52"
          />
          <Button size="sm" iconLeft={<Plus size={14} />} loading={create.isPending} onClick={add}>
            Add column
          </Button>
        </div>
      )}

      <p className="mt-3 font-mono text-[11px] text-text-4">
        Sign-off columns can only be moved into by someone who may approve tasks. Finished columns
        drop off My Day. A column still holding tasks cannot be deleted.
      </p>

      {!canManage && (
        <p className="mt-2 font-mono text-[11px] text-text-4">Only Super Admins and Admins can manage statuses.</p>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          remove.mutate(pendingDelete.key, {
            onSuccess: () => toast('Column deleted', 'success'),
            // The foreign key refuses while tasks still sit in it, which is the
            // answer we want; say so in words rather than showing the raw error.
            onError: () => toast('That column still has tasks in it. Move them first.', 'error'),
          })
          setPendingDelete(null)
        }}
        title="Delete this column"
        message={`"${pendingDelete?.label}" will be removed from every board. This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
