import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

const DISMISSED_KEY = 'linknbit-pwa-install-dismissed-at'
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }

  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0)
    const dismissedRecently = dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_MS
    if (dismissedRecently) return

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    const onInstalled = () => {
      setVisible(false)
      setInstallEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!visible || !installEvent) return null

  const install = async () => {
    await installEvent.prompt()
    await installEvent.userChoice
    setVisible(false)
    setInstallEvent(null)
  }

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setVisible(false)
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 right-4 z-50 flex w-[min(360px,calc(100vw-32px))] items-center gap-3 rounded-md border border-border-default bg-surface-1 p-3 shadow-pop',
        'lg:bottom-5',
      )}
      role="dialog"
      aria-label="Install Linknbit"
    >
      <img src="/icons/pwa-192x192.png" alt="" className="size-10 rounded-sm" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[13px] font-bold leading-tight text-text-1">Install Linknbit</p>
        <p className="mt-0.5 font-ui text-[11.5px] leading-snug text-text-3">Open faster from your device.</p>
      </div>
      <button
        type="button"
        onClick={install}
        className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-brand-red text-white hover:bg-brand-red-hover"
        aria-label="Install app"
      >
        <Download size={16} />
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="flex size-8 shrink-0 items-center justify-center rounded-sm text-text-3 hover:bg-surface-2 hover:text-text-1"
        aria-label="Dismiss install prompt"
      >
        <X size={15} />
      </button>
    </div>
  )
}
