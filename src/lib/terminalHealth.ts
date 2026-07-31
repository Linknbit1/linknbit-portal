/**
 * Terminal liveness, derived from the Pi's last heartbeat.
 *
 * The threshold matches TERMINAL_STALE_MIN in the attendance-checkin edge
 * function: once a terminal reads 'offline' here, that same function has stopped
 * enforcing terminal-only check-in, so portal check-in is available again. Keep
 * the two in step or the UI will claim a state the backend disagrees with.
 */
export const TERMINAL_STALE_MIN = 10

export type TerminalHealth = 'online' | 'stale' | 'offline' | 'disabled'

export interface TerminalHealthInfo {
  health: TerminalHealth
  /** Whole minutes since the last heartbeat; null when it has never reported. */
  minutesSince: number | null
  label: string
}

export function terminalHealth(
  lastHeartbeatAt: string | null,
  isActive: boolean,
  now: Date = new Date(),
): TerminalHealthInfo {
  if (!isActive) {
    return { health: 'disabled', minutesSince: null, label: 'Disabled' }
  }
  if (!lastHeartbeatAt) {
    return { health: 'offline', minutesSince: null, label: 'Never reported' }
  }

  const minutes = Math.floor((now.getTime() - new Date(lastHeartbeatAt).getTime()) / 60000)

  if (minutes < 2) return { health: 'online', minutesSince: minutes, label: 'Online' }
  if (minutes < TERMINAL_STALE_MIN) {
    return { health: 'stale', minutesSince: minutes, label: `Last seen ${minutes}m ago` }
  }

  if (minutes < 60) return { health: 'offline', minutesSince: minutes, label: `Offline ${minutes}m` }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { health: 'offline', minutesSince: minutes, label: `Offline ${hours}h` }
  return { health: 'offline', minutesSince: minutes, label: `Offline ${Math.floor(hours / 24)}d` }
}

/** Device RTC drift worth surfacing — beyond this, late/on-time calls are suspect. */
export const CLOCK_SKEW_WARN_SEC = 60

export function clockSkewLabel(skewSec: number | null): string | null {
  if (skewSec === null || Math.abs(skewSec) <= CLOCK_SKEW_WARN_SEC) return null
  const sign = skewSec > 0 ? 'ahead' : 'behind'
  const abs = Math.abs(skewSec)
  if (abs < 3600) return `Device clock ${Math.round(abs / 60)}m ${sign}`
  return `Device clock ${(abs / 3600).toFixed(1)}h ${sign}`
}
