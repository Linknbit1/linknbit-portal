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
