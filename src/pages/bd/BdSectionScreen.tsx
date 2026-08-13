import type { ComponentType } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { BdPrototypeProvider } from '../../context/BdPrototypeContext'
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
 * Every screen renders from the prototype store, not an API. The provider sits
 * here rather than in App.tsx so its state is scoped to the module: leaving BD
 * and coming back resets it, which is the honest behaviour for mock data.
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
  return (
    <BdPrototypeProvider>
      <Section />
    </BdPrototypeProvider>
  )
}
