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

/** Whether the app can be installed now, and a trigger for the native prompt. */
export function usePwaInstall(): { canInstall: boolean; install: () => Promise<void> } {
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

  return { canInstall: !installed && !!deferredPrompt, install }
}
