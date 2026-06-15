import { useEffect, useReducer } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

/** iOS Safari never fires `beforeinstallprompt`; installs are a manual "Add to Home Screen" flow. */
function isIos(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const iOsDevice = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ reports as desktop Safari but exposes touch + Mac platform.
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOsDevice || iPadOs
}

// Module-level singleton: the `beforeinstallprompt` event fires once, early, so we
// capture it at import time (before React mounts) and let components subscribe.
let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = isStandalone()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    emit()
  })
}

interface PwaInstall {
  /** A native install prompt is available (Android/desktop Chromium). */
  canInstall: boolean
  /** Running on iOS where install is a manual "Add to Home Screen" flow. */
  isIos: boolean
  /** Already launched as an installed app — no install affordance needed. */
  isInstalled: boolean
  install: () => Promise<void>
}

/** Whether the app can be installed now, and a trigger for the native prompt. */
export function usePwaInstall(): PwaInstall {
  const [, force] = useReducer((x) => x + 1, 0)

  useEffect(() => {
    listeners.add(force)
    return () => { listeners.delete(force) }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    emit()
  }

  return {
    canInstall: !installed && !!deferredPrompt,
    isIos: isIos(),
    isInstalled: installed,
    install,
  }
}
