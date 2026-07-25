import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download, ExternalLink, Loader2, Lock, FileText, FileSpreadsheet, Presentation,
  FileArchive, File as FileIcon, FileAudio, Link2, X,
} from 'lucide-react'
import { fetchAttachmentById, getAttachmentUrl, type AttachmentRow } from '../../api/attachments'
import { FileViewerContext } from './fileViewerContext'
import { previewMode, embeddableLinkUrl, fileKind, formatFileSize, parseCsv, type FileKind } from '../../lib/attachment'
import { ModalShell } from '../ui/ModalShell'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

const DOWNLOAD_ICON: Record<FileKind, typeof FileIcon> = {
  image: FileIcon, video: FileIcon, audio: FileAudio, pdf: FileText, doc: FileText, sheet: FileSpreadsheet,
  slides: Presentation, archive: FileArchive, text: FileText, other: FileIcon,
}

export function FileViewerProvider({ children }: { children: ReactNode }) {
  const [row, setRow] = useState<AttachmentRow | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const openAttachment = useCallback((a: AttachmentRow) => { setPendingId(null); setRow(a) }, [])
  const openAttachmentId = useCallback((id: string) => { setRow(null); setPendingId(id) }, [])
  const close = useCallback(() => { setRow(null); setPendingId(null) }, [])

  const value = useMemo(() => ({ openAttachment, openAttachmentId }), [openAttachment, openAttachmentId])

  return (
    <FileViewerContext.Provider value={value}>
      {children}
      {(row || pendingId) && (
        <FileViewerModal row={row} pendingId={pendingId} onClose={close} />
      )}
    </FileViewerContext.Provider>
  )
}

function FileViewerModal({ row, pendingId, onClose }: {
  row: AttachmentRow | null
  pendingId: string | null
  onClose: () => void
}) {
  // Resolve by id when opened from a file-tag; RLS returns null if not permitted.
  const idQuery = useQuery({
    queryKey: ['attachment', pendingId],
    queryFn: () => fetchAttachmentById(pendingId ?? ''),
    enabled: !!pendingId,
    staleTime: 60_000,
  })
  const file = row ?? idQuery.data ?? null
  const resolving = !!pendingId && idQuery.isLoading

  return (
    <ModalShell onClose={onClose} size="xl" scroll={false} contentClassName="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {file?.kind === 'link' ? <Link2 size={15} className="shrink-0 text-text-3" /> : <FileIcon size={15} className="shrink-0 text-text-3" />}
          <p className="truncate font-ui text-[13px] font-semibold text-text-1">{file?.file_name ?? 'File'}</p>
          {file?.is_confidential && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-xs border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-warning">
              <Lock size={9} /> Confidential
            </span>
          )}
        </div>
        <button onClick={onClose} className="shrink-0 text-text-4 transition-colors hover:text-text-1"><X size={18} /></button>
      </div>

      <div className="min-h-[60vh] flex-1 bg-bg-base">
        {resolving ? (
          <Centered><Loader2 size={22} className="animate-spin text-text-3" /></Centered>
        ) : !file ? (
          <Centered>
            <div className="text-center">
              <Lock size={26} className="mx-auto mb-2 text-text-4" />
              <p className="font-ui text-[13px] text-text-2">This file isn’t available to you.</p>
              <p className="mt-1 font-ui text-[11.5px] text-text-4">It may be confidential or on a project you can’t access.</p>
            </div>
          </Centered>
        ) : (
          <ViewerBody file={file} onClose={onClose} />
        )}
      </div>
    </ModalShell>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-[60vh] items-center justify-center p-6">{children}</div>
}

function ViewerError({ label, error }: { label: string; error: unknown }) {
  const msg = error instanceof Error ? error.message : ''
  return (
    <Centered>
      <div className="max-w-md text-center">
        <p className="font-ui text-[13px] text-error">{label}</p>
        {msg && <p className="mt-1.5 wrap-break-word font-mono text-[11px] text-text-4">{msg}</p>}
      </div>
    </Centered>
  )
}

function ViewerBody({ file, onClose }: { file: AttachmentRow; onClose: () => void }) {
  // ── External document link ──
  if (file.kind === 'link') {
    const embed = file.link_url ? embeddableLinkUrl(file.link_url) : null
    if (embed) {
      return <iframe title={file.file_name} src={embed} className="h-[74vh] w-full border-0 bg-white" allow="autoplay" />
    }
    return (
      <Centered>
        <OpenExternally url={file.link_url} label="Open link in a new tab" />
      </Centered>
    )
  }

  // ── Uploaded file: preview image/video/pdf via a signed URL ──
  const mode = previewMode(file.mime_type, file.file_name)
  return <UploadedViewer file={file} mode={mode} onClose={onClose} />
}

function UploadedViewer({ file, mode, onClose }: {
  file: AttachmentRow
  mode: ReturnType<typeof previewMode>
  onClose: () => void
}) {
  // A signed URL is only needed for the previewable kinds; download fetches its own.
  const urlQuery = useQuery({
    queryKey: ['attachment-url', file.id, file.storage_path],
    queryFn: () => getAttachmentUrl(file.storage_path ?? ''),
    enabled: mode !== 'download' && !!file.storage_path,
    staleTime: 30_000,
  })

  const download = async () => {
    if (!file.storage_path) return
    const url = await getAttachmentUrl(file.storage_path)
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  if (mode === 'download') {
    const Icon = DOWNLOAD_ICON[fileKind(file.mime_type, file.file_name)]
    return (
      <Centered>
        <div className="text-center">
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-xl bg-surface-2 text-text-3"><Icon size={26} /></span>
          <p className="font-ui text-[13px] text-text-1">{file.file_name}</p>
          <p className="mt-1 font-mono text-[11px] text-text-4">{formatFileSize(file.file_size)} · can’t preview this type</p>
          <Button size="sm" className="mt-4" onClick={download}><Download size={13} /> Download to view</Button>
        </div>
      </Centered>
    )
  }

  if (urlQuery.isLoading) return <Centered><Loader2 size={22} className="animate-spin text-text-3" /></Centered>
  if (urlQuery.isError || !urlQuery.data) {
    return <Centered><p className="font-ui text-[13px] text-error">Could not load this file.</p></Centered>
  }
  const url = urlQuery.data

  if (mode === 'image') {
    return (
      <div className="flex h-[74vh] items-center justify-center overflow-auto p-4">
        <img src={url} alt={file.file_name} className="max-h-full max-w-full rounded-md object-contain" />
      </div>
    )
  }
  if (mode === 'video') {
    return (
      <div className="flex h-[74vh] items-center justify-center bg-black p-2">
        <video src={url} controls className="max-h-full max-w-full" />
      </div>
    )
  }
  if (mode === 'audio') {
    return (
      <div className="flex items-center justify-center p-10">
        <audio src={url} controls className="w-full max-w-md">
          <track kind="captions" />
        </audio>
      </div>
    )
  }
  if (mode === 'docx') return <DocxView url={url} name={file.file_name} />
  if (mode === 'xlsx') return <XlsxView url={url} />
  if (mode === 'csv') return <CsvView url={url} />
  if (mode === 'markdown') return <MarkdownView url={url} name={file.file_name} />
  if (mode === 'text') return <TextView url={url} />
  // pdf
  return <iframe title={file.file_name} src={url} className="h-[74vh] w-full border-0 bg-white" />
}

// Word documents: converted to HTML in-browser (nothing leaves storage) and rendered
// inside a script-less sandboxed iframe so no document-embedded markup can execute.
const DOCX_CSS = `
  html,body{margin:0}
  body{font:14px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;padding:32px 40px;max-width:820px;margin:0 auto}
  h1,h2,h3{line-height:1.25}img{max-width:100%}table{border-collapse:collapse}
  td,th{border:1px solid #ccc;padding:4px 8px}a{color:#0b66c3}
`
function DocxView({ url, name }: { url: string; name: string }) {
  const q = useQuery({
    queryKey: ['docx', url],
    queryFn: async () => {
      const buf = await (await fetch(url)).arrayBuffer()
      const mammoth = await import('mammoth')
      const res = await mammoth.convertToHtml({ arrayBuffer: buf })
      return res.value
    },
    staleTime: 60_000,
  })
  if (q.isLoading) return <Centered><Loader2 size={22} className="animate-spin text-text-3" /></Centered>
  if (q.isError) return <ViewerError label="Could not render this document." error={q.error} />
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>${DOCX_CSS}</style></head><body>${q.data ?? ''}</body></html>`
  return <iframe title={name} sandbox="" srcDoc={srcDoc} className="h-[74vh] w-full border-0 bg-white" />
}

function cellText(c: unknown): string {
  if (c == null) return ''
  if (c instanceof Date) return c.toLocaleDateString()
  return String(c)
}

/** Shared spreadsheet/CSV grid — first row as header, capped for perf. */
function DataTable({ rows }: { rows: unknown[][] }) {
  const [head, ...body] = rows
  const capped = body.slice(0, 1000)
  if (!head) return <Centered><p className="font-ui text-[13px] text-text-4">Empty sheet.</p></Centered>
  return (
    <div className="h-full overflow-auto p-4">
      <table className="w-full border-collapse font-mono text-[12px]">
        <thead className="sticky top-0">
          <tr>{head.map((c, i) => <th key={i} className="border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-left font-semibold text-text-2">{cellText(c)}</th>)}</tr>
        </thead>
        <tbody>
          {capped.map((r, ri) => (
            <tr key={ri} className="odd:bg-surface-1/40">
              {r.map((c, ci) => <td key={ci} className="border border-border-subtle px-2.5 py-1.5 text-text-2">{cellText(c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {body.length > capped.length && (
        <p className="mt-3 font-mono text-[11px] text-text-4">Showing first {capped.length.toLocaleString()} of {body.length.toLocaleString()} rows — download for the full file.</p>
      )}
    </div>
  )
}

function CsvView({ url }: { url: string }) {
  const q = useQuery({
    queryKey: ['csv', url],
    queryFn: async () => parseCsv(await (await fetch(url)).text()),
    staleTime: 60_000,
  })
  if (q.isLoading) return <Centered><Loader2 size={22} className="animate-spin text-text-3" /></Centered>
  if (q.isError || !q.data) return <Centered><p className="font-ui text-[13px] text-error">Could not read this file.</p></Centered>
  return <div className="h-[74vh]"><DataTable rows={q.data} /></div>
}

// Excel: parsed in-browser via read-excel-file (all sheets). Files stay in storage.
function XlsxView({ url }: { url: string }) {
  const [sheet, setSheet] = useState(0)
  const q = useQuery({
    queryKey: ['xlsx', url],
    queryFn: async () => {
      const blob = await (await fetch(url)).blob()
      const readXlsxFile = (await import('read-excel-file/browser')).default
      return readXlsxFile(blob) // → { sheet, data }[]
    },
    staleTime: 60_000,
  })
  if (q.isLoading) return <Centered><Loader2 size={22} className="animate-spin text-text-3" /></Centered>
  if (q.isError) return <ViewerError label="Could not read this spreadsheet." error={q.error} />
  if (!q.data?.length) return <Centered><p className="font-ui text-[13px] text-text-4">This spreadsheet is empty.</p></Centered>
  const sheets = q.data
  const active = sheets[Math.min(sheet, sheets.length - 1)]
  return (
    <div className="flex h-[74vh] flex-col">
      {sheets.length > 1 && (
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border-subtle bg-surface-1 px-3 py-1.5">
          {sheets.map((s, i) => (
            <button
              key={i}
              onClick={() => setSheet(i)}
              className={cn('shrink-0 rounded-sm px-2.5 py-1 font-ui text-[12px] transition-colors',
                i === sheet ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1')}
            >
              {s.sheet}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <DataTable rows={active.data} />
      </div>
    </div>
  )
}

// GitHub-flavoured document styling for the markdown iframe.
const MARKDOWN_CSS = `
  html,body{margin:0}
  body{font:14px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;padding:32px 40px;max-width:860px;margin:0 auto;word-wrap:break-word}
  h1,h2,h3,h4{line-height:1.25;margin:1.4em 0 .5em;font-weight:600}
  h1{font-size:1.9em;border-bottom:1px solid #e2e2e2;padding-bottom:.3em}
  h2{font-size:1.5em;border-bottom:1px solid #ececec;padding-bottom:.3em}
  h3{font-size:1.25em}h4{font-size:1.05em}
  p,ul,ol,blockquote,table,pre{margin:0 0 1em}
  ul,ol{padding-left:1.6em}li{margin:.25em 0}
  a{color:#0b66c3;text-decoration:none}a:hover{text-decoration:underline}
  code{background:#f2f3f5;border-radius:4px;padding:.15em .35em;font:12.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
  pre{background:#f6f8fa;border:1px solid #e6e8eb;border-radius:8px;padding:14px 16px;overflow:auto}
  pre code{background:none;padding:0}
  blockquote{border-left:3px solid #d6d9dc;color:#57606a;padding:0 1em;margin-left:0}
  table{border-collapse:collapse;display:block;overflow:auto}
  th,td{border:1px solid #d6d9dc;padding:6px 12px}th{background:#f6f8fa}
  img{max-width:100%}hr{border:none;border-top:1px solid #e2e2e2;margin:1.6em 0}
`
// Markdown → HTML in-browser, rendered inside a script-less sandboxed iframe so any
// raw HTML embedded in the document can't execute.
function MarkdownView({ url, name }: { url: string; name: string }) {
  const q = useQuery({
    queryKey: ['md', url],
    queryFn: async () => {
      const text = await (await fetch(url)).text()
      const { marked } = await import('marked')
      return marked.parse(text, { gfm: true, breaks: true })
    },
    staleTime: 60_000,
  })
  if (q.isLoading) return <Centered><Loader2 size={22} className="animate-spin text-text-3" /></Centered>
  if (q.isError) return <ViewerError label="Could not render this markdown file." error={q.error} />
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>${MARKDOWN_CSS}</style></head><body>${q.data ?? ''}</body></html>`
  return <iframe title={name} sandbox="" srcDoc={srcDoc} className="h-[74vh] w-full border-0 bg-white" />
}

function TextView({ url }: { url: string }) {
  const q = useQuery({
    queryKey: ['text', url],
    queryFn: async () => (await (await fetch(url)).text()).slice(0, 500_000),
    staleTime: 60_000,
  })
  if (q.isLoading) return <Centered><Loader2 size={22} className="animate-spin text-text-3" /></Centered>
  if (q.isError) return <Centered><p className="font-ui text-[13px] text-error">Could not read this file.</p></Centered>
  return (
    <div className="h-[74vh] overflow-auto p-4">
      <pre className="whitespace-pre-wrap wrap-break-word font-mono text-caption/relaxed text-text-2">{q.data}</pre>
    </div>
  )
}

function OpenExternally({ url, label }: { url: string | null; label: string }) {
  if (!url) return <p className="font-ui text-[13px] text-text-4">This link is unavailable.</p>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-2 rounded-md border border-border-default bg-surface-2 px-4 py-2.5 font-ui text-[13px] text-text-1 transition-colors hover:border-border-strong')}
    >
      <ExternalLink size={14} /> {label}
    </a>
  )
}
