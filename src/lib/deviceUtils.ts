// Pure functions — no React, no Supabase.

/**
 * Builds a stable browser/device fingerprint using canvas rendering + environment signals.
 * Not cryptographically unique but sufficient to detect same-device reuse across employees.
 */
export async function getDeviceFingerprint(): Promise<string> {
  const signals: string[] = [
    navigator.userAgent,
    navigator.language,
    String(screen.width) + 'x' + String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency ?? ''),
    String((navigator as { deviceMemory?: number }).deviceMemory ?? ''),
  ]

  // Canvas fingerprint — renders text and shape; different GPU/driver/font combos produce different pixels
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = "14px 'Arial'"
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
      ctx.fillText('Linknbit🔐', 2, 15)
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
      ctx.fillText('Linknbit🔐', 4, 17)
      signals.push(canvas.toDataURL())
    }
  } catch {
    // canvas blocked (e.g. privacy mode) — fingerprint is still valid without it
  }

  const raw = signals.join('|')
  const encoded = new TextEncoder().encode(raw)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Returns a human-readable device label from the User-Agent string.
 * Examples: "iPhone (iOS 17.4)", "Samsung SM-A515F (Android 12)", "Windows PC (Chrome 124)"
 */
export function getDeviceName(ua: string = navigator.userAgent): string {
  // iOS devices
  const iosMatch = ua.match(/iPhone|iPad|iPod/)
  if (iosMatch) {
    const versionMatch = ua.match(/OS (\d+[_\d]*)/)
    const version = versionMatch ? versionMatch[1].replace(/_/g, '.') : ''
    return `${iosMatch[0]}${version ? ` (iOS ${version})` : ''}`
  }

  // Android devices — try to get model
  const androidMatch = ua.match(/Android ([\d.]+).*?;\s*([^;)]+)\s*(?:Build|\))/)
  if (androidMatch) {
    const version = androidMatch[1]
    const model = androidMatch[2].trim()
    return `${model} (Android ${version})`
  }

  // Generic Android fallback
  const androidFallback = ua.match(/Android ([\d.]+)/)
  if (androidFallback) {
    return `Android ${androidFallback[1]} Device`
  }

  // Windows
  if (/Windows NT/.test(ua)) {
    const browserMatch = ua.match(/(Chrome|Firefox|Edge|Safari)\/([\d.]+)/)
    const browser = browserMatch ? `${browserMatch[1]} ${browserMatch[2].split('.')[0]}` : 'Browser'
    return `Windows PC (${browser})`
  }

  // macOS
  if (/Macintosh/.test(ua)) {
    const browserMatch = ua.match(/(Chrome|Firefox|Safari)\/([\d.]+)/)
    const browser = browserMatch ? `${browserMatch[1]} ${browserMatch[2].split('.')[0]}` : 'Browser'
    return `Mac (${browser})`
  }

  // Linux
  if (/Linux/.test(ua)) {
    return 'Linux Device'
  }

  return 'Unknown Device'
}
