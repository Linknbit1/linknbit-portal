import { FileText, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { useToast } from '../ui/toast-context'
import { useWorkLogExport } from '../../hooks/useReports'
import { downloadCsv } from '../../lib/csv'
import { WORK_LOG_HEADERS, workLogCsvRows } from '../../lib/workLog'

interface WorkLogExportButtonProps {
  from: string
  to: string
  /** Narrows the log to one person — the employee drill-down. */
  profileId?: string
  /** Narrows the log to one project — the project drill-down. */
  projectId?: string
  /** Goes into the file name, e.g. a person's or project's name. */
  label?: string
}

/**
 * Downloads every timer segment in the range with its description — the sheet
 * that says what people worked on, beside the totals that say how long.
 */
export function WorkLogExportButton({ from, to, profileId, projectId, label }: WorkLogExportButtonProps) {
  const toast = useToast()
  const exportLog = useWorkLogExport()

  const run = () => {
    exportLog.mutate({ from, to, profileId, projectId }, {
      onSuccess: (rows) => {
        if (rows.length === 0) { toast('No timer entries in this range', 'error'); return }
        const slug = label ? `${label.replace(/\W+/g, '-')}_` : ''
        downloadCsv(`work-log_${slug}${from}_to_${to}.csv`, WORK_LOG_HEADERS, workLogCsvRows(rows))
        toast(`Exported ${rows.length} time entries`, 'success')
      },
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not export the work log', 'error'),
    })
  }

  return (
    <Button variant="secondary" size="sm" onClick={run} disabled={exportLog.isPending}>
      {exportLog.isPending ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} Export work log
    </Button>
  )
}
