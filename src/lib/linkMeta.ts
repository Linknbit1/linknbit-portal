import {
  FileText, FileSpreadsheet, Presentation, FolderOpen, Link2, type LucideIcon,
} from 'lucide-react'

/** Icon + label + tint for a recognised Google Workspace / Drive URL. */
export function linkMeta(url: string): { icon: LucideIcon; label: string; tint: string } {
  if (/docs\.google\.com\/spreadsheets/.test(url)) return { icon: FileSpreadsheet, label: 'Google Sheet', tint: 'text-success' }
  if (/docs\.google\.com\/document/.test(url))     return { icon: FileText,        label: 'Google Doc',   tint: 'text-service-dev' }
  if (/docs\.google\.com\/presentation/.test(url)) return { icon: Presentation,    label: 'Google Slides', tint: 'text-service-mkt' }
  if (/drive\.google\.com/.test(url))              return { icon: FolderOpen,      label: 'Google Drive', tint: 'text-service-mkt' }
  return { icon: Link2, label: 'Link', tint: 'text-text-3' }
}
