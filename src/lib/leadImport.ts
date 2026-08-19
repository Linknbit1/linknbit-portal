// Turning a spreadsheet into leads: the column contract, the sample file, and
// the row-by-row parse. Pure — it takes text and the department roster, and
// returns drafts plus the reasons any row was refused. Nothing here touches
// React, Supabase or TanStack Query.

import { CHANNEL_CONFIG, CHANNEL_ORDER, STAGE_CONFIG, STAGE_ORDER, BD_SERVICES, BD_INDUSTRIES } from '../constants/bd'
import { parseCsv } from './csv'
import { randomUUID } from './uuid'
import type { Lead, LeadStage, BdChannel, LeadTemperature, IcpFit } from '../types'

/* ── The column contract ───────────────────────────────────────────────────── */

export interface LeadImportColumn {
  /** The header as it appears in the sample file. */
  key: string
  /** Header spellings also accepted, so a hand-made sheet is not rejected on a synonym. */
  aliases?: string[]
  required?: boolean
  /** What may go in the cell, shown in the modal's reference table. */
  accepts: string
  /** What lands in the lead when the cell is blank. */
  fallback: string
}

/**
 * Column order is also the sample file's column order.
 *
 * Every default mirrors the column default in `bd_leads`, so a sheet with only
 * a company name produces exactly the lead the New Lead form would produce with
 * only a company name typed in.
 */
export const LEAD_IMPORT_COLUMNS: LeadImportColumn[] = [
  { key: 'company', required: true, accepts: 'Any text', fallback: '— required —' },
  { key: 'contact_name', aliases: ['contact'], accepts: 'Any text', fallback: 'Empty' },
  { key: 'contact_title', aliases: ['title', 'job_title'], accepts: 'Any text', fallback: 'Empty' },
  { key: 'email', accepts: 'Any text', fallback: 'Empty' },
  { key: 'phone', accepts: 'Any text', fallback: 'Empty' },
  {
    key: 'channel', aliases: ['source'],
    accepts: CHANNEL_ORDER.map((c) => CHANNEL_CONFIG[c].label).join(', '),
    fallback: 'Website/SEO',
  },
  { key: 'services', accepts: `${BD_SERVICES.join(', ')} — separate several with ;`, fallback: 'None' },
  { key: 'industry', accepts: BD_INDUSTRIES.join(', '), fallback: 'Other' },
  { key: 'icp_fit', aliases: ['fit'], accepts: 'Strong fit, Partial fit, Not a fit', fallback: 'Partial fit' },
  { key: 'value', aliases: ['deal_value', 'amount'], accepts: 'A number in PKR — 450000 or 450,000', fallback: '0' },
  { key: 'stage', accepts: STAGE_ORDER.map((s) => STAGE_CONFIG[s].label).join(', '), fallback: 'New Lead' },
  { key: 'temperature', accepts: 'Hot, Warm, Cold', fallback: 'Warm' },
  { key: 'owner', aliases: ['owner_name', 'rep'], accepts: 'The full name of someone in BD', fallback: 'You' },
  { key: 'added_on', aliases: ['date_added'], accepts: 'YYYY-MM-DD', fallback: 'Today' },
  { key: 'last_contacted', accepts: 'YYYY-MM-DD', fallback: 'Same as added_on' },
  { key: 'next_follow_up', aliases: ['follow_up'], accepts: 'YYYY-MM-DD', fallback: 'Empty' },
  { key: 'notes', aliases: ['description'], accepts: 'Any text', fallback: 'Empty' },
]

/**
 * Rows shipped in the downloadable sample.
 *
 * Filled-in rather than blank, and deliberately uneven: the first row uses every
 * column, the second leaves most of them out. Someone who opens the file learns
 * both the format and that only `company` is actually compulsory.
 */
export const LEAD_IMPORT_SAMPLE_ROWS: string[][] = [
  [
    'Nordic Freight Systems', 'Henrik Sølvberg', 'Head of Operations',
    'henrik@nordicfreight.no', '+47 22 44 51 90', 'LinkedIn',
    'Web Dev; Workflow Automation', 'Logistics', 'Strong fit', '1250000',
    'Qualified', 'Hot', '', '2026-08-04', '2026-08-14', '2026-08-21',
    'Wants the driver app rebuilt before their Q4 freight peak.',
  ],
  [
    'Meridian Health Group', 'Sara Qureshi', 'Marketing Director',
    'sara@meridianhealth.pk', '+92 21 3456 7788', 'Referral',
    'Digital Marketing', 'Healthcare', 'Partial fit', '380,000',
    'Contacted', 'Warm', '', '2026-08-11', '2026-08-11', '',
    'Introduced by the Cricket Sansar team.',
  ],
  ['Starlight Interiors', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
]

export const LEAD_IMPORT_HEADERS = LEAD_IMPORT_COLUMNS.map((c) => c.key)

/* ── Parsing ───────────────────────────────────────────────────────────────── */

export interface LeadImportRow {
  /** Line number as the spreadsheet shows it — the header is line 1. */
  line: number
  company: string
  /** Null when the row could not be read; `errors` says why. */
  lead: Lead | null
  errors: string[]
  /** A lead with this company name is already in the pipeline. Imported anyway. */
  duplicate: boolean
}

export interface LeadImportResult {
  rows: LeadImportRow[]
  /** The rows that produced a lead, in file order. */
  ready: Lead[]
  /** Headers in the file we do not recognise. Reported, then ignored. */
  unknownColumns: string[]
  /** Required headers the file does not have at all — this stops the import. */
  missingColumns: string[]
}

export interface LeadImportContext {
  people: { id: string; name: string }[]
  viewerId: string
  viewerName: string
  /** Company names already in the pipeline, for the duplicate flag. */
  existingCompanies: string[]
}

/** Headers, enum labels and person names all match on this — case and spacing are noise. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

/** Accepts the stored key (`cold_call`) or the label people actually type (`Cold Call`). */
function matchChannel(raw: string): BdChannel | null {
  const n = normalize(raw)
  return CHANNEL_ORDER.find((c) => c === n || normalize(CHANNEL_CONFIG[c].label) === n) ?? null
}

function matchStage(raw: string): LeadStage | null {
  const n = normalize(raw)
  return STAGE_ORDER.find((s) => s === n || normalize(STAGE_CONFIG[s].label) === n) ?? null
}

const TEMPERATURE_WORDS: Record<string, LeadTemperature> = { hot: 'hot', warm: 'warm', cold: 'cold' }

const ICP_WORDS: Record<string, IcpFit> = {
  strong: 'strong', strong_fit: 'strong',
  partial: 'partial', partial_fit: 'partial',
  none: 'none', not_a_fit: 'none', no: 'none',
}

/** ISO only. `03/04/2026` is March in one country and April in the next — refuse it rather than guess. */
function matchDate(raw: string): string | null {
  const s = raw.trim().replace(/\//g, '-')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : s
}

function matchList(raw: string, allowed: string[]): { values: string[]; unknown: string[] } {
  const values: string[] = []
  const unknown: string[] = []
  for (const part of raw.split(/[;|,]/)) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const hit = allowed.find((a) => normalize(a) === normalize(trimmed))
    if (hit) values.push(hit)
    else unknown.push(trimmed)
  }
  return { values, unknown }
}

/**
 * Read a CSV into lead drafts.
 *
 * A bad cell fails its row and nothing else: the point of an import is that 48
 * good rows still land when 2 are wrong, and the operator gets a list precise
 * enough to fix the sheet without guessing which line broke.
 */
export function parseLeadCsv(text: string, ctx: LeadImportContext): LeadImportResult {
  const table = parseCsv(text)
  if (table.length === 0) {
    return { rows: [], ready: [], unknownColumns: [], missingColumns: LEAD_IMPORT_HEADERS.filter((h) => h === 'company') }
  }

  // ── Map the file's headers onto our columns ──
  const header = table[0].map(normalize)
  const indexOf = new Map<string, number>()
  const matchedIndices = new Set<number>()

  for (const col of LEAD_IMPORT_COLUMNS) {
    const names = [col.key, ...(col.aliases ?? [])]
    const at = header.findIndex((h) => names.includes(h))
    if (at !== -1) {
      indexOf.set(col.key, at)
      matchedIndices.add(at)
    }
  }

  const unknownColumns = table[0].filter((_, i) => !matchedIndices.has(i) && header[i] !== '')
  const missingColumns = LEAD_IMPORT_COLUMNS.filter((c) => c.required && !indexOf.has(c.key)).map((c) => c.key)
  if (missingColumns.length > 0) return { rows: [], ready: [], unknownColumns, missingColumns }

  const today = new Date().toISOString().slice(0, 10)
  const existing = new Set(ctx.existingCompanies.map((c) => c.trim().toLowerCase()))
  const rows: LeadImportRow[] = []

  for (let r = 1; r < table.length; r++) {
    const cells = table[r]
    const cell = (key: string): string => {
      const at = indexOf.get(key)
      return at === undefined ? '' : (cells[at] ?? '').trim()
    }

    const errors: string[] = []
    const company = cell('company')
    if (!company) errors.push('company is required')

    const channelRaw = cell('channel')
    const channel = channelRaw ? matchChannel(channelRaw) : 'inbound'
    if (!channel) errors.push(`channel “${channelRaw}” is not one of the accepted values`)

    const stageRaw = cell('stage')
    const stage = stageRaw ? matchStage(stageRaw) : 'new'
    if (!stage) errors.push(`stage “${stageRaw}” is not one of the accepted values`)

    const tempRaw = cell('temperature')
    const temperature = tempRaw ? TEMPERATURE_WORDS[normalize(tempRaw)] : 'warm'
    if (!temperature) errors.push(`temperature “${tempRaw}” must be Hot, Warm or Cold`)

    const icpRaw = cell('icp_fit')
    const icpFit = icpRaw ? ICP_WORDS[normalize(icpRaw)] : 'partial'
    if (!icpFit) errors.push(`icp_fit “${icpRaw}” must be Strong fit, Partial fit or Not a fit`)

    const services = matchList(cell('services'), BD_SERVICES)
    if (services.unknown.length > 0) errors.push(`services we do not sell: ${services.unknown.join(', ')}`)

    const industryRaw = cell('industry')
    const industry = industryRaw
      ? BD_INDUSTRIES.find((i) => normalize(i) === normalize(industryRaw))
      : 'Other'
    if (!industry) errors.push(`industry “${industryRaw}” is not one of the accepted values`)

    const valueRaw = cell('value').replace(/[,\s]/g, '')
    const value = valueRaw === '' ? 0 : Number(valueRaw)
    if (!Number.isFinite(value) || value < 0) errors.push(`value “${cell('value')}” is not a number`)

    // Blank owner means the importer; a name that matches nobody is an error
    // rather than a silent fallback, or a typo quietly reassigns the lead.
    const ownerRaw = cell('owner')
    let ownerId = ctx.viewerId
    let ownerName = ctx.viewerName
    if (ownerRaw) {
      const person = ctx.people.find((p) => normalize(p.name) === normalize(ownerRaw))
      if (person) {
        ownerId = person.id
        ownerName = person.name
      } else {
        errors.push(`owner “${ownerRaw}” is not someone with BD access`)
      }
    }

    const dates: Record<string, string | null> = {}
    for (const key of ['added_on', 'last_contacted', 'next_follow_up']) {
      const raw = cell(key)
      if (!raw) { dates[key] = null; continue }
      const parsed = matchDate(raw)
      if (!parsed) errors.push(`${key} “${raw}” must be written as YYYY-MM-DD`)
      dates[key] = parsed
    }

    const notes = cell('notes')
    const addedOn = dates.added_on ?? today

    rows.push({
      line: r + 1,
      company,
      duplicate: !!company && existing.has(company.toLowerCase()),
      errors,
      lead:
        errors.length > 0 || !channel || !stage || !temperature || !icpFit || !industry
          ? null
          : {
              id: randomUUID(),
              company,
              contactName: cell('contact_name'),
              contactTitle: cell('contact_title'),
              email: cell('email'),
              phone: cell('phone'),
              channel,
              services: services.values,
              industry,
              icpFit,
              value,
              stage,
              temperature,
              ownerId,
              ownerName,
              addedOn,
              lastContacted: dates.last_contacted ?? addedOn,
              nextFollowUp: dates.next_follow_up,
              closedAt: null,
              description: notes || undefined,
              activityCount: 0,
            },
    })
  }

  return {
    rows,
    ready: rows.flatMap((r) => (r.lead ? [r.lead] : [])),
    unknownColumns,
    missingColumns,
  }
}
