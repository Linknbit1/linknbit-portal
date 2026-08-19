// Pure CSV helpers — build an RFC-4180 CSV string and trigger a browser download.

type CsvCell = string | number | boolean | null | undefined

function escapeCell(value: CsvCell): string {
  const s = value == null ? '' : String(value)
  // Quote when the value contains a comma, quote, or newline; double inner quotes.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
  return lines.join('\r\n')
}

export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  // Prepend a BOM so Excel detects UTF-8 correctly.
  const blob = new Blob(['﻿' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Parse an RFC-4180 CSV into rows of raw cells.
 *
 * Hand-rolled rather than pulled in as a dependency: the format is small, and
 * the three things that actually break real spreadsheet exports — a quoted
 * field containing a comma or a newline, doubled quotes inside one, and Excel's
 * UTF-8 BOM — are a few lines each. Cells are returned untrimmed; what counts
 * as blank is the caller's business.
 *
 * Blank lines are dropped, so a file with a trailing newline does not produce a
 * phantom last row.
 */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]

    if (quoted) {
      if (ch !== '"') { cell += ch; continue }
      // A doubled quote is an escaped quote; a lone one ends the field.
      if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      continue
    }

    if (ch === '"') { quoted = true; continue }
    if (ch === ',') { row.push(cell); cell = ''; continue }
    // CRLF and CR line endings both resolve on the \n, or on the CR when alone.
    if (ch === '\r') {
      if (src[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
      continue
    }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue }
    cell += ch
  }
  row.push(cell)
  rows.push(row)

  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}
