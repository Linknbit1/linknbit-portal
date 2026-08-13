import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { Skeleton } from '../../components/ui/Skeleton'
import { projectTaskDrawerHref, TASK_PROJECT_REDIRECT_QUERY_PARAM } from '../../constants/notifications'
import { useTask } from '../../hooks/useTasks'
import { TaskDetailContent } from './TaskDetailContent'

export default function TaskDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const shouldOpenInProject = new URLSearchParams(location.search).get(TASK_PROJECT_REDIRECT_QUERY_PARAM) === '1'
  const { data: redirectTask, isLoading: redirecting } = useTask(shouldOpenInProject ? id : undefined)

  useEffect(() => {
    if (!shouldOpenInProject || !redirectTask?.project_id) return
    navigate(projectTaskDrawerHref(redirectTask.project_id, redirectTask.id), { replace: true })
  }, [navigate, redirectTask?.id, redirectTask?.project_id, shouldOpenInProject])

  if (shouldOpenInProject && (redirecting || redirectTask?.project_id)) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Task" back="/admin/tasks" />
        <div className="p-4 lg:p-6 max-w-7xl mx-auto w-full">
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Task" back="/admin/tasks" />
      {/* Wide enough that the main column still breathes after the 384px activity
          rail takes its share — max-w-5xl left the properties grid cramped. */}
      <div className="p-4 lg:p-6 max-w-7xl mx-auto w-full">
        <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
          <TaskDetailContent taskId={id} onClosed={() => navigate('/admin/tasks')} />
        </div>
      </div>
    </div>
  )
}
