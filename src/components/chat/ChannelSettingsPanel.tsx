import { useState } from 'react'
import { Hash, Megaphone, MessageSquare, Settings2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useToast } from '../ui/toast-context'
import { useUpdateChannel, useSetChannelPostPolicy } from '../../hooks/useChannels'
import { useChannelCategories, useSetChannelCategory } from '../../hooks/useChannelCategories'
import type { ChannelListItem } from '../../api/channels'

/**
 * Everything about a channel that its managers can change, in the chat itself.
 *
 * Deliberately here and not in Settings: these are decisions you make while
 * looking at the conversation, and burying them in a portal-wide settings screen
 * is how they went unfound in the first place. Renaming, recategorising and
 * choosing who may post were all technically possible already and had nowhere
 * to be done from.
 */
export function ChannelSettingsPanel({
  channel,
  canManage,
}: {
  channel: ChannelListItem
  canManage: boolean
}) {
  const toast = useToast()
  const update = useUpdateChannel()
  const setCategory = useSetChannelCategory()
  const setPolicy = useSetChannelPostPolicy()
  const { data: categories = [] } = useChannelCategories()

  const [name, setName] = useState(channel.name ?? '')

  // A DM has no name, no category and no posting rules: both people always post.
  if (channel.kind === 'dm' || !canManage) return null

  const fail = (e: unknown) => toast(e instanceof Error ? e.message : 'Could not save that', 'error')

  const commitName = () => {
    const next = name.trim()
    if (!next || next === channel.name) { setName(channel.name ?? ''); return }
    update.mutate(
      { id: channel.id, patch: { name: next } },
      { onSuccess: () => toast('Channel renamed', 'success'), onError: fail },
    )
  }

  return (
    <div className="shrink-0 border-b border-border-default">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Settings2 size={13} className="text-text-3" />
        <h4 className="font-display text-[13px] font-bold text-text-1">Channel settings</h4>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <div className="space-y-1">
          <label className="font-mono text-[10px] uppercase tracking-wider text-text-4">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            iconLeft={<Hash size={13} />}
          />
        </div>

        <div className="space-y-1">
          <label className="font-mono text-[10px] uppercase tracking-wider text-text-4">Category</label>
          <Select
            value={channel.category_id ?? ''}
            onChange={(v) => setCategory.mutate(
              { channelId: channel.id, categoryId: v || null },
              { onError: fail },
            )}
            options={[
              { value: '', label: 'Uncategorised' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        <div className="space-y-1">
          <label className="font-mono text-[10px] uppercase tracking-wider text-text-4">Who can post</label>
          <div className="flex gap-1 rounded-sm border border-border-default bg-surface-1 p-1">
            {([
              { key: 'everyone', label: 'Everyone', icon: MessageSquare, hint: 'Any member can send messages' },
              { key: 'managers', label: 'Managers only', icon: Megaphone, hint: 'An announcement channel' },
            ] as const).map((opt) => {
              const on = (channel.post_policy ?? 'everyone') === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  title={opt.hint}
                  onClick={() => setPolicy.mutate({ channelId: channel.id, policy: opt.key }, { onError: fail })}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 font-ui text-[12px] font-medium transition-colors',
                    on ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1',
                  )}
                >
                  <opt.icon size={12} />
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p className="font-ui text-[11px] text-text-4">
            {(channel.post_policy ?? 'everyone') === 'managers'
              ? 'Only managers can send here. Everyone else can read and react.'
              : 'Anyone in the channel can send.'}
          </p>
        </div>
      </div>
    </div>
  )
}
