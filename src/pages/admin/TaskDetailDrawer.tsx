import { useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { TaskDetailContent } from './TaskDetailContent'

interface TaskDetailDrawerProps {
  taskId: string | null
  open: boolean
  onClose: () => void
}

export function TaskDetailDrawer({ taskId, open, onClose }: TaskDetailDrawerProps) {
  const [wide, setWide] = useState(false)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={wide ? 'min(95vw, 1600px)' : 'min(82vw, 1280px)'}
      title={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWide((w) => !w)}
            className="hidden lg:flex size-7 rounded-sm items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors"
            aria-label={wide ? 'Collapse panel' : 'Expand panel'}
          >
            {wide ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      }
    >
      {taskId && <TaskDetailContent taskId={taskId} onClosed={onClose} fill />}
    </Drawer>
  )
}
