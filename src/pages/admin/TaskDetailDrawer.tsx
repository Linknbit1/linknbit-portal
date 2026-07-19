import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Maximize2, Minimize2 } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { TaskDetailContent } from './TaskDetailContent'

interface TaskDetailDrawerProps {
  taskId: string | null
  open: boolean
  onClose: () => void
}

export function TaskDetailDrawer({ taskId, open, onClose }: TaskDetailDrawerProps) {
  const navigate = useNavigate()
  const [wide, setWide] = useState(false)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={wide ? 'min(62vw, 980px)' : 480}
      title={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWide((w) => !w)}
            className="hidden lg:flex size-7 rounded-sm items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors"
            aria-label={wide ? 'Collapse panel' : 'Expand panel'}
          >
            {wide ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={() => taskId && navigate(`/admin/tasks/${taskId}`)}
            className="flex items-center gap-1.5 font-ui text-[12px] text-text-3 hover:text-text-1 transition-colors"
          >
            Open full page <ArrowUpRight size={13} />
          </button>
        </div>
      }
    >
      {taskId && <TaskDetailContent taskId={taskId} onClosed={onClose} wide={wide} />}
    </Drawer>
  )
}
