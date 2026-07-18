import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { TaskDetailContent } from './TaskDetailContent'

interface TaskDetailDrawerProps {
  taskId: string | null
  open: boolean
  onClose: () => void
}

export function TaskDetailDrawer({ taskId, open, onClose }: TaskDetailDrawerProps) {
  const navigate = useNavigate()

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={480}
      title={
        <button
          onClick={() => taskId && navigate(`/admin/tasks/${taskId}`)}
          className="flex items-center gap-1.5 font-ui text-[12px] text-text-3 hover:text-text-1 transition-colors"
        >
          Open full page <ArrowUpRight size={13} />
        </button>
      }
    >
      {taskId && <TaskDetailContent taskId={taskId} onClosed={onClose} />}
    </Drawer>
  )
}
