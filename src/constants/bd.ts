import {
  // Lucide dropped its brand icons, so LinkedIn borrows Contact — the closest
  // "professional network" glyph available.
  Briefcase, ShoppingBag, Contact, Mail, Phone, Globe, Users,
  Circle, CircleDotDashed, BadgeCheck, FileText, Handshake, Trophy, XCircle,
  Ban, CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import type { LeadStage, BdChannel, BdTaskStatus, BdTaskPriority } from '../types'

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

export const CHANNEL_CONFIG: Record<BdChannel, { label: string; icon: LucideIcon; tint: string }> = {
  upwork:    { label: 'Upwork',      icon: Briefcase,   tint: 'text-[#22C55E]' },
  fiverr:    { label: 'Fiverr',      icon: ShoppingBag, tint: 'text-[#2DD4BF]' },
  linkedin:  { label: 'LinkedIn',    icon: Contact,     tint: 'text-[#60A5FA]' },
  email:     { label: 'Email',       icon: Mail,        tint: 'text-[#A78BFA]' },
  cold_call: { label: 'Cold Call',   icon: Phone,       tint: 'text-[#F59E0B]' },
  inbound:   { label: 'Website/SEO', icon: Globe,       tint: 'text-[#22D3EE]' },
  referral:  { label: 'Referral',    icon: Users,       tint: 'text-[#FBBF24]' },
}

/** Channels in reporting order — outreach volume first, passive sources last. */
export const CHANNEL_ORDER: BdChannel[] = [
  'upwork', 'fiverr', 'linkedin', 'email', 'cold_call', 'inbound', 'referral',
]

/* ── BD task board ─────────────────────────────────────────────────────────── */

/**
 * Four columns, not the delivery board's seven. BD work is either queued, being
 * done, stuck on someone else, or finished — there is no review or approval gate
 * on sending a proposal.
 */
export const TASK_STATUS_CONFIG: Record<BdTaskStatus, { label: string; icon: LucideIcon; accent: string; dropBorder: string }> = {
  todo: {
    label: 'To Do', icon: Circle,
    accent: 'bg-[rgba(138,147,163,0.14)] text-[#8A93A3] border-[rgba(138,147,163,0.28)]',
    dropBorder: 'border-[#8A93A3]',
  },
  in_progress: {
    label: 'In Progress', icon: CircleDotDashed,
    accent: 'bg-[rgba(245,158,11,0.14)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]',
    dropBorder: 'border-[#F59E0B]',
  },
  blocked: {
    label: 'Blocked', icon: Ban,
    accent: 'bg-[rgba(244,54,76,0.1)] text-[#F4364C] border-[rgba(244,54,76,0.3)]',
    dropBorder: 'border-[#F4364C]',
  },
  done: {
    label: 'Done', icon: CheckCircle2,
    accent: 'bg-[rgba(34,197,94,0.13)] text-[#22C55E] border-[rgba(34,197,94,0.3)]',
    dropBorder: 'border-[#22C55E]',
  },
}

export const TASK_STATUS_ORDER: BdTaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']

export const TASK_PRIORITY_CONFIG: Record<BdTaskPriority, { label: string; classes: string; dot: string }> = {
  high:   { label: 'High',   classes: 'bg-[rgba(244,54,76,0.12)] text-[#F4364C] border-[rgba(244,54,76,0.3)]',   dot: 'bg-[#F4364C]' },
  medium: { label: 'Medium', classes: 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]', dot: 'bg-[#F59E0B]' },
  low:    { label: 'Low',    classes: 'bg-surface-3 text-text-3 border-border-default',                          dot: 'bg-text-4' },
}
