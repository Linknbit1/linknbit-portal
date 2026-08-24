import { useMemo, useState } from 'react'
import {
  Mail, Phone, Building2, Trash2, Pencil, Plus, CalendarClock, ArrowRight,
  MessageSquare, FileText, StickyNote, GitCommitHorizontal, Video, CheckCircle2,
  Globe, MapPin, ExternalLink,
} from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { Tabs } from '../../components/ui/Tabs'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/toast-context'
import { TemperatureChip, IcpFitChip, ChannelChip } from '../../components/shared/BdChips'
import { BdCommentThread } from '../../components/shared/BdCommentThread'
import { SocialBadge } from '../../components/shared/SocialBadge'
import { AttachmentUploader } from '../../components/shared/AttachmentUploader'
import { useLeadAttachments } from '../../hooks/useAttachments'
import { externalHref, prettyUrl, socialPlatform } from '../../lib/socialLinks'
import { BdDocEditor } from '../../components/editor/BdDocEditor'
import { STAGE_CONFIG, STAGE_ORDER } from '../../constants/bd'
import { useBd } from '../../context/BdContext'
import { useBdComments } from '../../hooks/useBd'
import { HandoffModal } from './HandoffModal'
import { cn } from '../../lib/cn'
import { plainTextToDoc, toDbDoc } from '../../lib/richText'
import { formatCompactCurrency, formatDate, formatRelativeTime, getDaysUntil } from '../../lib/utils'
import type { Lead, LeadStage, BdActivityType } from '../../types'

const ACTIVITY_ICON: Record<BdActivityType, typeof Mail> = {
  call: Phone,
  email: Mail,
  linkedin: MessageSquare,
  meeting: Video,
  proposal: FileText,
  note: StickyNote,
  stage_change: GitCommitHorizontal,
}

const OUTCOME_LABEL: Record<string, string> = {
  connected: 'Connected',
  no_response: 'No response',
  follow_up: 'Follow-up needed',
  meeting_booked: 'Meeting booked',
  not_interested: 'Not interested',
}

const LOST_REASONS = [
  { value: 'Budget', label: 'Budget' },
  { value: 'Timing', label: 'Timing' },
  { value: 'Went with competitor', label: 'Went with competitor' },
  { value: 'No response', label: 'No response' },
]

interface LeadDrawerProps {
  lead: Lead | null
  onClose: () => void
  onEdit: (lead: Lead) => void
  onLogActivity: (lead: Lead) => void
}

/**
 * The lead record, opened from a board card or table row.
 *
 * A drawer rather than a modal on purpose: the board stays visible behind it, so
 * moving between leads never costs the reader their place in the pipeline.
 */
export function LeadDrawer({ lead, onClose, onEdit, onLogActivity }: LeadDrawerProps) {
  const toast = useToast()
  const {
    activities, meetings, tasks, handoffs, moveLeadStage, deleteLead, patchLead, people, avatarOf,
    canSeeAll: canManageBd, viewerRepId,
  } = useBd()
  // Its own query rather than a slice of the BD context: documents are read only
  // when this drawer is open, so loading them with the whole module would be a
  // request every pipeline visitor pays for and almost nobody uses.
  const { data: leadDocuments = [] } = useLeadAttachments(lead?.id)
  const [tab, setTab] = useState('activity')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pendingLost, setPendingLost] = useState<string | null>(null)
  const [handoffOpen, setHandoffOpen] = useState(false)

  const leadActivities = useMemo(
    () => (lead ? activities.filter((a) => a.leadId === lead.id).sort((a, b) => b.at.localeCompare(a.at)) : []),
    [activities, lead],
  )
  const leadMeetings = useMemo(
    () => (lead ? meetings.filter((m) => m.leadId === lead.id).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)) : []),
    [meetings, lead],
  )
  const leadTasks = useMemo(
    () => (lead ? tasks.filter((t) => t.leadId === lead.id) : []),
    [tasks, lead],
  )

  /** Anyone in BD is taggable in the notes and in the thread. */
  const mentionItems = useMemo(
    () => people.map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url })),
    [people],
  )

  // Read only for the tab badge — the thread itself fetches (and subscribes) when
  // opened. Same cache entry either way, so this costs no extra request.
  const { data: leadComments = [] } = useBdComments('lead', lead?.id)

  if (!lead) return null

  const handleStage = (next: string) => {
    const stage = next as LeadStage
    if (stage === lead.stage) return
    // Lost needs a reason — that is the whole point of recording it.
    if (stage === 'lost') { setPendingLost(LOST_REASONS[0].value); return }
    moveLeadStage(lead.id, stage)
    toast(`${lead.company} moved to ${STAGE_CONFIG[stage].label}`, 'success')
    // Winning is the one move that has somewhere to go next.
    if (stage === 'won' && !lead.handoffId) setHandoffOpen(true)
  }

  const confirmLost = () => {
    moveLeadStage(lead.id, 'lost', pendingLost ?? 'No response')
    toast(`${lead.company} marked lost — ${pendingLost}`, 'info')
    setPendingLost(null)
  }

  const daysUntilFollowUp = lead.nextFollowUp ? getDaysUntil(lead.nextFollowUp) : null
  const websiteHref = externalHref(lead.website)
  // "Oslo, Norway", or whichever half was recorded.
  const location = [lead.city, lead.country].filter(Boolean).join(', ')
  const handoff = handoffs.find((h) => h.leadId === lead.id)

  return (
    <>
      <Drawer
        open={!!lead}
        onClose={onClose}
        width={560}
        title={
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-2">
              <Building2 size={15} className="text-text-3" />
            </span>
            <span className="min-w-0 truncate">{lead.company}</span>
          </span>
        }
        footer={
          <div className="flex items-center gap-2">
            <Button size="sm" iconLeft={<Plus size={15} />} onClick={() => onLogActivity(lead)}>
              Log activity
            </Button>
            <Button size="sm" variant="secondary" iconLeft={<Pencil size={14} />} onClick={() => onEdit(lead)}>
              Edit
            </Button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete lead"
              className="ml-auto flex size-8 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-error/10 hover:text-error"
            >
              <Trash2 size={15} />
            </button>
          </div>
        }
      >
        <div className="flex flex-col">
          {/* ── Headline ── */}
          <div className="flex flex-col gap-4 border-b border-border-subtle p-5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-ui text-[13.5px] text-text-1">{lead.contactName}</p>
                <p className="font-ui text-[12px] text-text-3">{lead.contactTitle}</p>
                <a
                  href={`mailto:${lead.email}`}
                  className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[11.5px] text-text-3 transition-colors hover:text-brand-red"
                >
                  <Mail size={11} /> {lead.email}
                </a>
              </div>
              <div className="text-right">
                <p className="font-display text-[19px] font-bold tabular-nums text-text-1">
                  {formatCompactCurrency(lead.valueEntered, lead.valueCurrency)}
                </p>
                <p className="font-ui text-[10.5px] uppercase tracking-widest text-text-4">Deal value</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <TemperatureChip temperature={lead.temperature} />
              <IcpFitChip fit={lead.icpFit} />
              <ChannelChip channel={lead.channel} />
              <span className="font-ui text-[11.5px] text-text-4">{lead.industry}</span>
            </div>
          </div>

          {/* ── Stage stepper: the record's primary control ── */}
          <div className="flex flex-col gap-2.5 border-b border-border-subtle px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-3">Stage</span>
              <Select
                value={lead.stage}
                onChange={handleStage}
                size="sm"
                className="w-40"
                options={STAGE_ORDER.map((s) => ({ value: s, label: STAGE_CONFIG[s].label }))}
              />
            </div>
            <StageStepper stage={lead.stage} />
            {lead.lostReason && (
              <p className="font-ui text-[12px] text-error">Lost — {lead.lostReason}</p>
            )}
            {lead.stage === 'won' && (
              handoff ? (
                <p className="flex items-center gap-1.5 font-ui text-[12px] text-success">
                  <ArrowRight size={12} className="shrink-0" />
                  Handed to {handoff.managerName} as “{handoff.projectName}”
                </p>
              ) : (
                <button
                  onClick={() => setHandoffOpen(true)}
                  className="flex items-center gap-1.5 self-start rounded-sm border border-success/30 bg-success/10 px-2.5 py-1 font-ui text-[12px] font-medium text-success transition-colors hover:bg-success/15"
                >
                  <ArrowRight size={12} /> Hand off to delivery
                </button>
              )
            )}
          </div>

          {/* ── At a glance ── */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 border-b border-border-subtle px-5 py-4">
            <Field label="Owner">
              <span className="flex items-center gap-2">
                <Avatar name={lead.ownerName} src={avatarOf(lead.ownerId)} size="xs" />
                <span className="truncate font-ui text-[12.5px] text-text-2">{lead.ownerName}</span>
              </span>
            </Field>
            <Field label="Next follow-up">
              {lead.nextFollowUp ? (
                <span
                  className={cn(
                    'font-mono text-[12.5px]',
                    daysUntilFollowUp !== null && daysUntilFollowUp < 0 ? 'text-error'
                      : daysUntilFollowUp === 0 ? 'text-warning' : 'text-text-2',
                  )}
                >
                  {formatDate(lead.nextFollowUp)}
                </span>
              ) : (
                <span className="font-mono text-[12.5px] text-text-4">—</span>
              )}
            </Field>
            <Field label="Added">
              <span className="font-mono text-[12.5px] text-text-2">{formatDate(lead.addedOn)}</span>
            </Field>
            <Field label="Last contacted">
              <span className={cn('font-mono text-[12.5px]', lead.lastContacted ? 'text-text-2' : 'text-text-4')}>
                {lead.lastContacted ? formatDate(lead.lastContacted) : 'Not contacted yet'}
              </span>
            </Field>
            <Field label="Services" className="col-span-2">
              <span className="flex flex-wrap gap-1">
                {lead.services.map((s) => (
                  <span
                    key={s}
                    className="rounded-xs border border-border-subtle bg-surface-2 px-1.5 py-0.5 font-ui text-[10.5px] text-text-3"
                  >
                    {s}
                  </span>
                ))}
              </span>
            </Field>

            {/* Only rendered when there is something to show — an empty grid of
                em-dashes is noise on a record nobody has filled in yet. */}
            {websiteHref && (
              <Field label="Website" className="col-span-2">
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 truncate font-ui text-[12.5px] text-service-dev hover:underline"
                >
                  <Globe size={12} className="shrink-0" />
                  {prettyUrl(lead.website)}
                  <ExternalLink size={11} className="shrink-0 opacity-60" />
                </a>
              </Field>
            )}
            {location && (
              <Field label="Location">
                <span className="flex items-center gap-1.5 font-ui text-[12.5px] text-text-2">
                  <MapPin size={12} className="shrink-0 text-text-4" />
                  {location}
                </span>
              </Field>
            )}
            {lead.source && (
              <Field label="Came from">
                <span className="font-ui text-[12.5px] text-text-2">{lead.source}</span>
              </Field>
            )}
            {lead.socials.length > 0 && (
              <Field label="Social profiles" className="col-span-2">
                <span className="flex flex-wrap items-center gap-1.5">
                  {lead.socials.map((s) => {
                    const href = externalHref(s.url)
                    const platform = socialPlatform(s.url)
                    return href ? (
                      <a
                        key={s.id}
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={`${platform?.label ?? 'Link'} — ${prettyUrl(s.url)}`}
                        className="transition-opacity hover:opacity-80"
                      >
                        <SocialBadge url={s.url} size="sm" />
                      </a>
                    ) : (
                      <SocialBadge key={s.id} url={s.url} size="sm" />
                    )
                  })}
                </span>
              </Field>
            )}
          </dl>

          {/* ── Tabs ── */}
          <div className="px-5 pt-3">
            <Tabs
              tabs={[
                { key: 'activity', label: 'Activity', badge: leadActivities.length },
                { key: 'notes', label: 'Notes' },
                { key: 'comments', label: 'Comments', badge: leadComments.length },
                { key: 'documents', label: 'Documents', badge: leadDocuments.length },
                { key: 'meetings', label: 'Meetings', badge: leadMeetings.length },
                { key: 'tasks', label: 'Tasks', badge: leadTasks.length },
              ]}
              activeKey={tab}
              onChange={setTab}
            />
          </div>

          {/* The thread carries its own full-width dividers and composer, so it
              sits outside the padded tab body rather than inside it. */}
          {tab === 'comments' && (
            <div className="mt-3 border-t border-border-default">
              <BdCommentThread parentType="lead" parentId={lead.id} />
            </div>
          )}

          <div className={cn('px-5 py-4', tab === 'comments' && 'hidden')}>
            {tab === 'documents' && (
              <div className="space-y-4">
                <AttachmentUploader
                  leadId={lead.id}
                  // Same rule the lead itself follows: its owner, whoever filed it,
                  // or anyone who runs BD. RLS says the same thing again server-side.
                  canManage={canManageBd || lead.ownerId === viewerRepId}
                />

                {/* Documents the sales sheet named but never gave an address for.
                    Kept visible rather than quietly dropped — knowing a proposal
                    exists is worth something even without the link. */}
                {lead.documents.length > 0 && (
                  <div className="rounded-md border border-dashed border-border-default px-3 py-2.5">
                    <p className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-4">
                      Named in the sales sheet · no link recorded
                    </p>
                    <ul className="mt-2 space-y-1">
                      {lead.documents.map((d) => (
                        <li key={d.id} className="flex items-center gap-1.5 font-ui text-[12px] text-text-3">
                          <FileText size={12} className="shrink-0 text-text-4" />
                          <span className="truncate">{d.title || prettyUrl(d.url)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {tab === 'notes' && (
              <div className="rounded-md border border-border-default bg-surface-inset px-3 py-2.5 focus-within:border-border-focus">
                <BdDocEditor
                  key={lead.id}
                  // Falls back to the plain column so a note written before rich
                  // text existed still shows up in the editor.
                  value={lead.doc ?? toDbDoc(plainTextToDoc(lead.description ?? ''))}
                  onSave={(doc, plain) => patchLead(lead.id, { doc, description: plain ?? undefined })}
                  mentionItems={mentionItems}
                  source={{ type: 'bd_lead', id: lead.id }}
                  placeholder="What matters about this prospect… type / for commands, @ to mention"
                />
              </div>
            )}

            {tab === 'activity' && (
              leadActivities.length === 0 ? (
                <EmptyHint
                  icon={MessageSquare}
                  title="No touchpoints logged"
                  body="Every call, email and message logged here feeds the outreach numbers."
                />
              ) : (
                <ol className="flex flex-col">
                  {leadActivities.map((a, i) => {
                    const Icon = ACTIVITY_ICON[a.type]
                    const last = i === leadActivities.length - 1
                    return (
                      <li key={a.id} className="flex gap-3">
                        {/* Rail: icon plus the connector to the next entry. */}
                        <div className="flex flex-col items-center">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-default bg-surface-2 text-text-3">
                            <Icon size={12} />
                          </span>
                          {!last && <span className="w-px flex-1 bg-border-subtle" />}
                        </div>
                        <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-4')}>
                          <p className="font-ui text-[12.5px] leading-snug text-text-2">{a.note}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10.5px] text-text-4">
                            <span>{a.byName}</span>
                            <span>·</span>
                            <span>{formatRelativeTime(a.at)}</span>
                            {a.outcome && (
                              <span className="rounded-sm border border-border-subtle bg-surface-2 px-1.5 py-px text-text-3">
                                {OUTCOME_LABEL[a.outcome]}
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )
            )}

            {tab === 'meetings' && (
              leadMeetings.length === 0 ? (
                <EmptyHint icon={CalendarClock} title="No meetings yet" body="Scheduled and past meetings for this lead appear here." />
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {leadMeetings.map((m) => (
                    <li key={m.id} className="rounded-md border border-border-default bg-surface-2 p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] tabular-nums text-text-1">
                          {new Date(m.scheduledAt).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        <span className="ml-auto font-ui text-[11px] uppercase tracking-wider text-text-4">
                          {m.durationMinutes} min
                        </span>
                      </div>
                      <p className="mt-1 font-ui text-[12.5px] text-text-2">{m.clientAttendees}</p>
                      {m.outcome && <p className="mt-1.5 font-ui text-caption/relaxed text-text-3">{m.outcome}</p>}
                      {m.nextStep && (
                        <p className="mt-1.5 flex items-center gap-1.5 font-ui text-[12px] text-text-3">
                          <ArrowRight size={12} className="shrink-0 text-brand-red" /> {m.nextStep}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )
            )}

            {tab === 'tasks' && (
              leadTasks.length === 0 ? (
                <EmptyHint icon={CheckCircle2} title="No tasks on this lead" body="Work raised from Business Dev → Tasks and linked here shows up in this list." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {leadTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2.5 rounded-md border border-border-default bg-surface-2 px-3 py-2.5"
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          t.status === 'completed' || t.status === 'approved' ? 'bg-success'
                            : t.status === 'blocked' ? 'bg-error'
                            : t.status === 'in_progress' ? 'bg-warning' : 'bg-text-4',
                        )}
                      />
                      <span className={cn('min-w-0 flex-1 truncate font-ui text-[12.5px]', t.status === 'completed' ? 'text-text-4 line-through' : 'text-text-2')}>
                        {t.title}
                      </span>
                      <Avatar name={t.assigneeName} src={avatarOf(t.assigneeId)} size="xs" />
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { deleteLead(lead.id); setConfirmDelete(false); onClose(); toast(`${lead.company} deleted`, 'info') }}
        title="Delete this lead?"
        message={`${lead.company} and its ${lead.activityCount} logged activities will be removed.`}
        confirmLabel="Delete lead"
      />

      <HandoffModal open={handoffOpen} lead={lead} onClose={() => setHandoffOpen(false)} />

      {/* Marking a lead lost is the one stage change that captures a reason, so
          the picker rides inside the confirm rather than opening a second step. */}
      <ConfirmDialog
        open={pendingLost !== null}
        onClose={() => setPendingLost(null)}
        onConfirm={confirmLost}
        title={`Mark ${lead.company} as lost?`}
        confirmLabel="Mark lost"
        message={
          <span className="block">
            Recording why keeps the channel win-rate honest.
            <Select
              value={pendingLost ?? LOST_REASONS[0].value}
              onChange={setPendingLost}
              options={LOST_REASONS}
              label="Reason"
              className="mt-3"
            />
          </span>
        }
      />
    </>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="font-ui text-[10.5px] uppercase tracking-wider text-text-4">{label}</dt>
      <dd className="mt-1 min-w-0">{children}</dd>
    </div>
  )
}

/** Seven dots would be noise; the stepper shows only the five open stages. */
function StageStepper({ stage }: { stage: LeadStage }) {
  // Annotated: TS narrows a filtered union via predicate inference, which would
  // make indexOf() reject the two terminal stages this deliberately accepts.
  const open: LeadStage[] = STAGE_ORDER.filter((s) => s !== 'won' && s !== 'lost' && s !== 'unqualified')
  const index = open.indexOf(stage)
  const closed = stage === 'won' || stage === 'lost' || stage === 'unqualified'

  return (
    <div className="flex items-center gap-1">
      {open.map((s, i) => (
        <span
          key={s}
          title={STAGE_CONFIG[s].label}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors duration-200',
            closed ? (stage === 'won' ? 'bg-success' : stage === 'lost' ? 'bg-error/60' : 'bg-surface-3')
              : i <= index ? 'bg-brand-red' : 'bg-surface-3',
          )}
        />
      ))}
    </div>
  )
}

function EmptyHint({ icon: Icon, title, body }: { icon: typeof Mail; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border-subtle px-4 py-8 text-center">
      <Icon size={18} className="text-text-4" />
      <p className="font-ui text-[13px] text-text-2">{title}</p>
      <p className="max-w-[36ch] font-ui text-[11.5px]/relaxed text-text-4">{body}</p>
    </div>
  )
}
