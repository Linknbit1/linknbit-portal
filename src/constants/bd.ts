import {
  // Lucide dropped its brand icons, so LinkedIn borrows Contact — the closest
  // "professional network" glyph available.
  Briefcase, ShoppingBag, Contact, Mail, Phone, Globe, Users,
  Circle, CircleDotDashed, BadgeCheck, FileText, Handshake, Trophy, XCircle,
  Ban, CheckCircle2, Eye,
  type LucideIcon,
} from 'lucide-react'
import type { LeadStage, BdChannel, TaskStatus, ProjectStatus } from '../types'

/**
 * Business Development lookup tables.
 *
 * Kept out of BdChips.tsx because that file exports components, and mixing
 * constants into it breaks Fast Refresh (react-refresh/only-export-components).
 */

/**
 * The stage palette runs cool → active → resolved so a board of seven columns
 * reads at a glance, the same approach TaskBoard takes. Won and Lost are the two
 * terminal stages and deliberately sit at opposite ends of the hue range.
 *
 * `accent` is the board column header; `chip` is the inline pill.
 */
export const STAGE_CONFIG: Record<LeadStage, { label: string; icon: LucideIcon; accent: string; chip: string; dropBorder: string }> = {
  new: {
    label: 'New Lead', icon: Circle,
    accent: 'bg-[rgba(138,147,163,0.14)] text-[#8A93A3] border-[rgba(138,147,163,0.28)]',
    chip: 'bg-surface-3 text-text-3 border-border-default',
    dropBorder: 'border-[#8A93A3]',
  },
  contacted: {
    label: 'Contacted', icon: CircleDotDashed,
    accent: 'bg-[rgba(96,165,250,0.13)] text-[#60A5FA] border-[rgba(96,165,250,0.3)]',
    chip: 'bg-[rgba(96,165,250,0.12)] text-[#60A5FA] border-[rgba(96,165,250,0.3)]',
    dropBorder: 'border-[#60A5FA]',
  },
  qualified: {
    label: 'Qualified', icon: BadgeCheck,
    accent: 'bg-[rgba(34,211,238,0.13)] text-[#22D3EE] border-[rgba(34,211,238,0.3)]',
    chip: 'bg-[rgba(34,211,238,0.12)] text-[#22D3EE] border-[rgba(34,211,238,0.3)]',
    dropBorder: 'border-[#22D3EE]',
  },
  proposal_sent: {
    label: 'Proposal Sent', icon: FileText,
    accent: 'bg-[rgba(167,139,250,0.14)] text-[#A78BFA] border-[rgba(167,139,250,0.3)]',
    chip: 'bg-[rgba(167,139,250,0.12)] text-[#A78BFA] border-[rgba(167,139,250,0.3)]',
    dropBorder: 'border-[#A78BFA]',
  },
  negotiation: {
    label: 'Negotiation', icon: Handshake,
    accent: 'bg-[rgba(245,158,11,0.14)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]',
    chip: 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]',
    dropBorder: 'border-[#F59E0B]',
  },
  won: {
    label: 'Won', icon: Trophy,
    accent: 'bg-[rgba(34,197,94,0.13)] text-[#22C55E] border-[rgba(34,197,94,0.3)]',
    chip: 'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.3)]',
    dropBorder: 'border-[#22C55E]',
  },
  lost: {
    label: 'Lost', icon: XCircle,
    accent: 'bg-[rgba(244,54,76,0.1)] text-[#F4364C] border-[rgba(244,54,76,0.3)]',
    chip: 'bg-[rgba(244,54,76,0.1)] text-[#F4364C] border-[rgba(244,54,76,0.3)]',
    dropBorder: 'border-[#F4364C]',
  },
}

/** Stages in pipeline order — the board's column order and the funnel's row order. */
export const STAGE_ORDER: LeadStage[] = [
  'new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost',
]

/**
 * `volumeLabel` is what one unit of effort is called on that channel — the
 * Log-outreach form relabels its count field from it, because "Proposals sent"
 * and "Calls made" are not the same question.
 *
 * `passive` marks the channels nobody sends on. Their volume arrives rather
 * than being pushed, so a logged count lands on `responses`, not `sent` — that
 * is why a response rate is undefined for them.
 */
export const CHANNEL_CONFIG: Record<BdChannel, { label: string; icon: LucideIcon; tint: string; volumeLabel: string; passive?: boolean }> = {
  upwork:    { label: 'Upwork',      icon: Briefcase,   tint: 'text-[#22C55E]', volumeLabel: 'Proposals sent' },
  fiverr:    { label: 'Fiverr',      icon: ShoppingBag, tint: 'text-[#2DD4BF]', volumeLabel: 'Briefs answered' },
  linkedin:  { label: 'LinkedIn',    icon: Contact,     tint: 'text-[#60A5FA]', volumeLabel: 'Connects & DMs sent' },
  email:     { label: 'Email',       icon: Mail,        tint: 'text-[#A78BFA]', volumeLabel: 'Emails sent' },
  cold_call: { label: 'Cold Call',   icon: Phone,       tint: 'text-[#F59E0B]', volumeLabel: 'Calls made' },
  inbound:   { label: 'Website/SEO', icon: Globe,       tint: 'text-[#22D3EE]', volumeLabel: 'Enquiries received', passive: true },
  referral:  { label: 'Referral',    icon: Users,       tint: 'text-[#FBBF24]', volumeLabel: 'Intros received',     passive: true },
}

/** Channels in reporting order — outreach volume first, passive sources last. */
export const CHANNEL_ORDER: BdChannel[] = [
  'upwork', 'fiverr', 'linkedin', 'email', 'cold_call', 'inbound', 'referral',
]

/* ── BD task board ─────────────────────────────────────────────────────────── */

export interface BdBoardColumn {
  status: TaskStatus
  label: string
  icon: LucideIcon
  /** Solid status pill at the top of the column — colour carries the meaning. */
  pill: string
  /** Whole-column wash, so a lane is identifiable before you read the header. */
  lane: string
  /** Text colour for the count and the column's "Add task" affordance. */
  accent: string
  /** Border while a card is dragged over this lane. */
  dropBorder: string
}

/**
 * The delivery board's columns, minus `backlog`.
 *
 * Same statuses, icons and hues as TaskBoard, but presented ClickUp-style: a
 * solid status pill with the count set outside it, and a wash of the status
 * colour across the whole lane rather than a single tinted header bar. Time
 * tracking is deliberately absent — BD measures outreach sent, not hours logged.
 */
export const BD_BOARD_COLUMNS: BdBoardColumn[] = [
  { status: 'todo', label: 'To Do', icon: Circle,
    pill: 'bg-[#60A5FA] text-[#0B1018]', lane: 'bg-[rgba(96,165,250,0.05)] border-[rgba(96,165,250,0.16)]',
    accent: 'text-[#60A5FA]', dropBorder: 'border-[#60A5FA]' },
  { status: 'in_progress', label: 'In Progress', icon: CircleDotDashed,
    pill: 'bg-[#F59E0B] text-[#0B1018]', lane: 'bg-[rgba(245,158,11,0.055)] border-[rgba(245,158,11,0.18)]',
    accent: 'text-[#F59E0B]', dropBorder: 'border-[#F59E0B]' },
  { status: 'review', label: 'Review', icon: Eye,
    pill: 'bg-[#A78BFA] text-[#0B1018]', lane: 'bg-[rgba(167,139,250,0.055)] border-[rgba(167,139,250,0.18)]',
    accent: 'text-[#A78BFA]', dropBorder: 'border-[#A78BFA]' },
  { status: 'approved', label: 'Approved', icon: BadgeCheck,
    pill: 'bg-[#22C55E] text-[#0B1018]', lane: 'bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.16)]',
    accent: 'text-[#22C55E]', dropBorder: 'border-[#22C55E]' },
  { status: 'completed', label: 'Completed', icon: CheckCircle2,
    pill: 'bg-[#2DD4BF] text-[#0B1018]', lane: 'bg-[rgba(45,212,191,0.05)] border-[rgba(45,212,191,0.16)]',
    accent: 'text-[#2DD4BF]', dropBorder: 'border-[#2DD4BF]' },
  { status: 'blocked', label: 'Blocked', icon: Ban,
    pill: 'bg-[#F4364C] text-white', lane: 'bg-[rgba(244,54,76,0.05)] border-[rgba(244,54,76,0.16)]',
    accent: 'text-[#F4364C]', dropBorder: 'border-[#F4364C]' },
]

/** BD project board columns — the delivery project statuses, unchanged. */
export const BD_PROJECT_COLUMNS: ProjectStatus[] = [
  'in_progress', 'ongoing', 'awaiting_client', 'blocked', 'on_hold', 'completed',
]
