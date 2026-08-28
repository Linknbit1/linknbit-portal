import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { Skeleton } from '../../components/ui/Skeleton'
import { projectTaskDrawerHref } from '../../constants/notifications'
import { useTask } from '../../hooks/useTasks'

/**
 * There is no task page any more, only a task drawer.
 *
 * A task read on its own loses the board it belongs to, and closing it left you
 * on a dead-end screen with nowhere to go but Back. This route survives purely
 * as a redirector so the addresses that already exist in the wild keep working:
 * old bookmarks, notification links, push payloads, and anything a person has
 * pasted into chat. All of them land in the project's side panel instead.
 */
export default function TaskDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: task, isLoading } = useTask(id)

  useEffect(() => {
    if (!task?.project_id) return
    navigate(projectTaskDrawerHref(task.project_id, task.id), { replace: true })
  }, [navigate, task?.id, task?.project_id])

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Task" back="/admin/tasks" />
      <div className="p-4 lg:p-6 max-w-3xl mx-auto w-full">
        {isLoading || task?.project_id ? (
          <Skeleton className="h-64" />
        ) : (
          // Same wording as the drawer: whether it is gone or simply not yours
          // is not something to spell out.
          <p className="p-8 text-center font-ui text-[13px] text-text-3">
            This task is not available. It may have been deleted, or it may not be one you have access to.
          </p>
        )}
      </div>
    </div>
  )
}
