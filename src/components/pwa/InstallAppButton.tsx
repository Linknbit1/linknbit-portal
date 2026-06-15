import { Download } from 'lucide-react'
import { cn } from '../../lib/cn'
import { usePwaInstall } from '../../hooks/usePwaInstall'

/**
 * Install-app affordance for the internal nav. Renders only when the app is
 * installable and not already installed; stays visible until installed (no dismiss).
 */
export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, install } = usePwaInstall()
  if (!canInstall) return null

  return (
    <button
      onClick={install}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm font-ui font-medium text-body-sm',
        'bg-brand-red/[0.13] text-text-1 hover:bg-brand-red/20 transition-colors',
        className,
      )}
    >
      <span className="w-6 h-6 rounded-sm bg-brand-red flex items-center justify-center flex-shrink-0">
        <Download size={13} className="text-white" />
      </span>
      <span className="flex flex-col items-start leading-tight min-w-0">
        <span className="text-[12.5px] font-semibold truncate">Install app</span>
        <span className="font-mono text-[10px] text-text-3">Open faster from your device</span>
      </span>
    </button>
  )
}
