import { useRef, useState } from 'react'
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, Copy, X, Loader2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toast-context'
import { StageChip, ChannelChip } from '../../components/shared/BdChips'
import { useBd } from '../../context/BdContext'
import { downloadCsv } from '../../lib/csv'
import {
  parseLeadCsv, LEAD_IMPORT_COLUMNS, LEAD_IMPORT_HEADERS, LEAD_IMPORT_SAMPLE_ROWS,
  type LeadImportResult,
} from '../../lib/leadImport'
import { cn } from '../../lib/cn'
import { formatCompactCurrency } from '../../lib/utils'

interface LeadImportModalProps {
  open: boolean
  onClose: () => void
}

/**
 * CSV → pipeline.
 *
 * Two steps, and the second one is the important one: nothing is written until
 * the operator has seen what will be written. A file that is 90% good imports
 * its 90% and hands back a numbered list of what to fix, because the
 * alternative — refusing the whole file over two bad rows — is what makes
 * people give up and paste leads in by hand.
 */
export function LeadImportModal({ open, onClose }: LeadImportModalProps) {
  const toast = useToast()
  const { leads, people, viewerRepId, viewerName, importLeads } = useBd()

  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<LeadImportResult | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setFileName('')
    setResult(null)
    setReadError(null)
  }

  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const downloadSample = () => {
    downloadCsv('linknbit-leads-sample', LEAD_IMPORT_HEADERS, LEAD_IMPORT_SAMPLE_ROWS)
  }

  const readFile = async (file: File | undefined) => {
    if (!file) return
    setReadError(null)
    if (!/\.csv$/i.test(file.name)) {
      setReadError('That is not a .csv file. Export the sheet as CSV and try again.')
      return
    }
    const text = await file.text()
    setFileName(file.name)
    setResult(
      parseLeadCsv(text, {
        people,
        viewerId: viewerRepId,
        viewerName,
        existingCompanies: leads.map((l) => l.company),
      }),
    )
  }

  const runImport = async () => {
    if (!result || result.ready.length === 0) return
    setBusy(true)
    try {
      await importLeads(result.ready)
      toast(`${result.ready.length} lead${result.ready.length !== 1 ? 's' : ''} added to the pipeline`, 'success')
      reset()
      onClose()
    } catch {
      setReadError('The import was refused. Nothing was added — check the rows and try again.')
    } finally {
      setBusy(false)
    }
  }

  const problemRows = result?.rows.filter((r) => r.errors.length > 0) ?? []
  const duplicates = result?.rows.filter((r) => r.lead && r.duplicate) ?? []

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      busy={busy}
      title="Import leads from CSV"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {result && (
            <span className="mr-auto font-ui text-[12px] text-text-3">
              {result.ready.length} of {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} ready
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={close} disabled={busy}>Cancel</Button>
          {result && result.ready.length > 0 && (
            <Button size="sm" onClick={runImport} disabled={busy} iconLeft={busy ? <Loader2 size={15} className="animate-spin" /> : undefined}>
              {busy ? 'Importing…' : `Import ${result.ready.length} lead${result.ready.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        {/* ── Drop zone ── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void readFile(e.dataTransfer.files[0]) }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center transition-colors',
            dragOver ? 'border-brand-red bg-brand-red/5' : 'border-border-default hover:border-border-strong hover:bg-surface-2',
          )}
        >
          <Upload size={18} className="text-text-3" />
          <span className="font-ui text-[12.5px] text-text-2">
            {fileName || 'Drop a CSV here, or click to choose one'}
          </span>
          <span className="font-ui text-[10.5px] text-text-4">
            Only <span className="font-mono">company</span> is required — everything else falls back to a default
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = '' }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" iconLeft={<Download size={14} />} onClick={downloadSample}>
            Download sample CSV
          </Button>
          {result && (
            <Button variant="ghost" size="sm" iconLeft={<X size={14} />} onClick={reset}>
              Choose a different file
            </Button>
          )}
        </div>

        {readError && (
          <p className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 font-ui text-[12px] text-error">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {readError}
          </p>
        )}

        {/* ── Before a file: what the columns are ── */}
        {!result && <ColumnReference />}

        {/* ── After a file: what will happen ── */}
        {result && (
          <>
            {result.missingColumns.length > 0 && (
              <p className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 font-ui text-[12px] text-error">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                The file has no <span className="font-mono">{result.missingColumns.join(', ')}</span> column.
                Download the sample and use its header row.
              </p>
            )}

            {result.unknownColumns.length > 0 && (
              <p className="font-ui text-[11.5px] text-text-3">
                Ignored {result.unknownColumns.length === 1 ? 'column' : 'columns'}{' '}
                <span className="font-mono text-text-2">{result.unknownColumns.join(', ')}</span> — not part of the format.
              </p>
            )}

            {result.rows.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Summary icon={CheckCircle2} tone="ok" label={`${result.ready.length} ready to import`} />
                {problemRows.length > 0 && (
                  <Summary icon={AlertTriangle} tone="bad" label={`${problemRows.length} skipped`} />
                )}
                {duplicates.length > 0 && (
                  <Summary icon={Copy} tone="warn" label={`${duplicates.length} already in the pipeline`} />
                )}
              </div>
            )}

            {problemRows.length > 0 && (
              <section className="rounded-md border border-error/25 bg-error/6">
                <h3 className="border-b border-error/20 px-3 py-2 font-ui text-[11.5px] font-bold uppercase tracking-wider text-error">
                  Skipped rows — the rest still import
                </h3>
                <ul className="max-h-40 divide-y divide-border-subtle overflow-y-auto">
                  {problemRows.map((row) => (
                    <li key={row.line} className="flex gap-2.5 px-3 py-2">
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-4">Line {row.line}</span>
                      <span className="min-w-0 font-ui text-[12px] text-text-2">
                        {row.company && <span className="font-medium text-text-1">{row.company} — </span>}
                        {row.errors.join('; ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.ready.length > 0 && <PreviewTable result={result} />}
          </>
        )}
      </div>
    </Modal>
  )
}

/* ── Pieces ────────────────────────────────────────────────────────────────── */

const SUMMARY_TONES = {
  ok: 'border-success/30 bg-success/10 text-success',
  warn: 'border-warning/30 bg-warning/10 text-warning',
  bad: 'border-error/30 bg-error/10 text-error',
} as const

function Summary({ icon: Icon, tone, label }: {
  icon: typeof CheckCircle2
  tone: keyof typeof SUMMARY_TONES
  label: string
}) {
  return (
    <span className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-ui text-[11.5px] font-medium', SUMMARY_TONES[tone])}>
      <Icon size={12} />
      {label}
    </span>
  )
}

/** The format, stated where the file gets chosen — not only inside the sample. */
function ColumnReference() {
  return (
    <section className="overflow-hidden rounded-md border border-border-default">
      <h3 className="flex items-center gap-2 border-b border-border-subtle bg-surface-2 px-3 py-2 font-ui text-[11.5px] font-bold uppercase tracking-wider text-text-2">
        <FileSpreadsheet size={13} />
        Columns
      </h3>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-surface-1">
            <tr className="border-b border-border-subtle text-left font-ui text-[10.5px] uppercase tracking-wider text-text-4">
              <th className="px-3 py-1.5 font-semibold">Column</th>
              <th className="px-3 py-1.5 font-semibold">Accepts</th>
              <th className="px-3 py-1.5 font-semibold">If left blank</th>
            </tr>
          </thead>
          <tbody>
            {LEAD_IMPORT_COLUMNS.map((col) => (
              <tr key={col.key} className="border-b border-border-subtle/60 last:border-0 align-top">
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11.5px] text-text-1">
                  {col.key}
                  {col.required && <span className="ml-1 text-brand-red">*</span>}
                </td>
                <td className="px-3 py-1.5 font-ui text-[11.5px] text-text-3">{col.accepts}</td>
                <td className="whitespace-nowrap px-3 py-1.5 font-ui text-[11.5px] text-text-4">{col.fallback}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** The first rows exactly as they will be stored — chips and all, so a mis-mapped column is obvious. */
function PreviewTable({ result }: { result: LeadImportResult }) {
  const shown = result.rows.filter((r) => r.lead).slice(0, 8)

  return (
    <section className="overflow-hidden rounded-md border border-border-default">
      <h3 className="border-b border-border-subtle bg-surface-2 px-3 py-2 font-ui text-[11.5px] font-bold uppercase tracking-wider text-text-2">
        Preview
        {result.ready.length > shown.length && (
          <span className="ml-2 font-normal normal-case tracking-normal text-text-4">
            first {shown.length} of {result.ready.length}
          </span>
        )}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left font-ui text-[10.5px] uppercase tracking-wider text-text-4">
              <th className="px-3 py-1.5 font-semibold">Company</th>
              <th className="px-3 py-1.5 font-semibold">Contact</th>
              <th className="px-3 py-1.5 font-semibold">Stage</th>
              <th className="px-3 py-1.5 font-semibold">Channel</th>
              <th className="px-3 py-1.5 font-semibold">Owner</th>
              <th className="px-3 py-1.5 text-right font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.line} className="border-b border-border-subtle/60 last:border-0">
                <td className="px-3 py-2 font-ui text-[12px] font-medium text-text-1">
                  {row.lead?.company}
                  {row.duplicate && (
                    <span className="ml-2 rounded-xs border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-ui text-[10px] text-warning">
                      already in pipeline
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-ui text-[12px] text-text-3">
                  {row.lead?.contactName || '—'}
                </td>
                <td className="px-3 py-2">{row.lead && <StageChip stage={row.lead.stage} />}</td>
                <td className="px-3 py-2">{row.lead && <ChannelChip channel={row.lead.channel} />}</td>
                <td className="whitespace-nowrap px-3 py-2 font-ui text-[12px] text-text-3">{row.lead?.ownerName}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-[12px] tabular-nums text-text-2">
                  {formatCompactCurrency(row.lead?.valueEntered ?? 0, row.lead?.valueCurrency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
