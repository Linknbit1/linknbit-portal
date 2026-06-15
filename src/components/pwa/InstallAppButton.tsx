import { useState } from 'react'
import { Download, Share, Plus, MoreHorizontal, PencilLine, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { ModalShell } from '../ui/ModalShell'

const IOS_STEPS = [
  { icon: Share, title: 'Tap the Share button', body: 'In Safari, tap the Share icon in the toolbar next to the address bar.' },
  { icon: MoreHorizontal, title: 'Open the full list', body: 'Scroll the share sheet and tap “View More” if you don’t see the next option.' },
  { icon: Plus, title: 'Add to Home Screen', body: 'Choose “Add to Home Screen” from the list of actions.' },
  { icon: PencilLine, title: 'Name it and confirm', body: 'Rename it to whatever you prefer, then tap “Add” in the top-right corner.' },
] as const

function IosInstallGuide({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} size="sm" contentClassName="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-sm bg-brand-red flex items-center justify-center flex-shrink-0">
            <Download size={13} className="text-white" />
          </span>
          Install on iPhone
        </h3>
        <button onClick={onClose} aria-label="Close" className="text-text-4 hover:text-text-1"><X size={18} /></button>
      </div>

      <p className="font-ui text-[12.5px] text-text-3 leading-relaxed mb-4">
        iOS installs apps straight from Safari. Follow these steps to add Linknbit to your home screen.
      </p>

      <ol className="flex flex-col gap-3">
        {IOS_STEPS.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3">
            <span className="relative flex-shrink-0 w-8 h-8 rounded-md bg-surface-2 border border-border-default flex items-center justify-center text-text-2">
              <step.icon size={15} />
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-brand-red text-white font-mono text-[9px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-ui font-semibold text-[13px] text-text-1 leading-tight">{step.title}</p>
              <p className="font-ui text-[11.5px] text-text-3 leading-snug mt-0.5">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <button
        onClick={onClose}
        className="mt-5 w-full py-2.5 rounded-sm bg-brand-red/[0.13] text-text-1 font-ui font-semibold text-[13px] hover:bg-brand-red/20 transition-colors"
      >
        Got it
      </button>
    </ModalShell>
  )
}

/**
 * Install-app affordance for the internal nav. Shows the native install prompt on
 * Android/desktop Chromium, and a manual "Add to Home Screen" guide on iOS where
 * `beforeinstallprompt` never fires. Hidden once the app is already installed.
 */
export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, isIos, isInstalled, install } = usePwaInstall()
  const [guideOpen, setGuideOpen] = useState(false)

  // Native prompt available, or iOS where we fall back to the manual guide.
  const showNative = canInstall
  const showIosGuide = !canInstall && isIos && !isInstalled
  if (!showNative && !showIosGuide) return null

  return (
    <>
      <button
        onClick={showNative ? install : () => setGuideOpen(true)}
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
          <span className="font-mono text-[10px] text-text-3">
            {showNative ? 'Open faster from your device' : 'See how to add it on iPhone'}
          </span>
        </span>
      </button>

      {guideOpen && <IosInstallGuide onClose={() => setGuideOpen(false)} />}
    </>
  )
}
