import { Navigate, useParams } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'

/**
 * Business Development — structure only, no functionality yet.
 *
 * Every section is a placeholder until the module is built out. The nav items
 * and routes carry `devOnly` / `can_view_bd` today so the shape can be reviewed
 * in a dev build without shipping empty screens to the department.
 *
 * Keys mirror the `to` paths in BD_CHILDREN (navItems.ts) exactly — an unknown
 * key bounces rather than rendering a blank shell.
 */
const BD_SECTIONS = [
  {
    key: 'pipeline',
    title: 'Pipeline',
    blurb: 'Every lead from first contact to won or lost, with the stage it sits in and who owns it.',
  },
  {
    key: 'meetings',
    title: 'Meetings',
    blurb: 'What is scheduled, who is running it, and what came out of it — across the whole department.',
  },
  {
    key: 'outreach',
    title: 'Outreach',
    blurb: 'Volume and response rate per channel: Upwork, Fiverr, LinkedIn, email, cold calling and inbound.',
  },
  {
    key: 'updates',
    title: 'Daily Updates',
    blurb: 'A short daily check-in per rep — which platforms were worked, and what came of it.',
  },
  {
    key: 'targets',
    title: 'Targets & KPIs',
    blurb: 'Revenue target against actual, pipeline value, win rate, average deal size and sales-cycle length.',
  },
  {
    key: 'reports',
    title: 'BD Reports',
    blurb: 'Weekly performance summaries, channel comparison and the funnel from new lead through won.',
  },
] as const

export default function BdSectionScreen() {
  const { section } = useParams()
  const match = BD_SECTIONS.find((s) => s.key === section)
  if (!match) return <Navigate to="/bd/pipeline" replace />

  return (
    <div className="flex flex-col flex-1">
      <Topbar title={match.title} />
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-8">
        <div className="size-14 rounded-xl bg-surface-2 border border-border-default flex items-center justify-center">
          <TrendingUp size={24} className="text-text-3" />
        </div>
        <h2 className="font-display font-semibold text-h3 text-text-1 tracking-tight">{match.title}</h2>
        <p className="text-body text-text-3 max-w-md">{match.blurb}</p>
        <p className="font-mono text-[11px] text-text-4 uppercase tracking-wider">Not built yet</p>
      </div>
    </div>
  )
}
