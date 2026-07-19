import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { TaskDetailContent } from './TaskDetailContent'

export default function TaskDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Task" back="/admin/tasks" />
      <div className="p-4 lg:p-6 max-w-5xl mx-auto w-full">
        <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
          <TaskDetailContent taskId={id} wide onClosed={() => navigate('/admin/tasks')} />
        </div>
      </div>
    </div>
  )
}
