import type { ComponentType } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import PipelinePage from './PipelinePage'
import BdProjectsPage from './BdProjectsPage'
import BdTasksPage from './BdTasksPage'
import MeetingsPage from './MeetingsPage'
import OutreachPage from './OutreachPage'
import DailyUpdatesPage from './DailyUpdatesPage'
import PerformancePage from './TargetsPage'

/**
 * Business Development section router.
 *
 * Keys mirror the `to` paths in BD_CHILDREN (navItems.ts) exactly; an unknown
 * key bounces to Pipeline rather than rendering a blank shell.
 *
 * Every screen reads the same composed data (BdProvider), mounted as a layout
 * route above this one, so moving between BD screens costs no refetch and the
 * live subscription is opened once rather than per page.
 */
const BD_SECTIONS: Record<string, ComponentType> = {
  pipeline: PipelinePage,
  projects: BdProjectsPage,
  tasks: BdTasksPage,
  meetings: MeetingsPage,
  outreach: OutreachPage,
  updates: DailyUpdatesPage,
  performance: PerformancePage,
}

export default function BdSectionScreen() {
  const { section } = useParams()
  const Section = section ? BD_SECTIONS[section] : undefined
  if (!Section) return <Navigate to="/bd/pipeline" replace />
  return <Section />
}
