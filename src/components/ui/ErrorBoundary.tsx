import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCw, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * The one class component in the codebase, and unavoidably so: catching a render
 * error is the single React capability with no hook equivalent.
 *
 * Without this, any throw during render unmounts the entire tree and leaves a
 * blank white document — which is exactly what happened when a stale client hit
 * the renamed WFH column: one undefined field on one panel took down the whole
 * portal, navigation included. A boundary turns that into a contained failure
 * with a way out.
 *
 * `resetKey` is how a page-level boundary recovers: pass the route path, and
 * navigating anywhere else clears the error instead of stranding the user on a
 * dead screen until they reload.
 */

interface ErrorBoundaryProps {
  children: ReactNode
  /** `page` fills the content area; `panel` sits inline where a widget would be. */
  variant?: 'page' | 'panel'
  /**
   * The client portal is a separate palette, not a dark-mode override of this
   * one — `surface-1` and `text-1` stay dark there. A boundary that can render
   * on either side has to say which set it is using.
   */
  theme?: 'internal' | 'client'
  /** What failed, in the reader's words: "This page", "The attendance summary". */
  label?: string
  /** Changing this value clears the error — pass the route path at page level. */
  resetKey?: string | number
}

interface ErrorBoundaryState {
  error: Error | null
}

const THEME = {
  internal: {
    card: 'border-border-default bg-surface-1',
    title: 'text-text-1',
    body: 'text-text-3',
    muted: 'text-text-4 hover:text-text-2',
    pre: 'border-border-subtle bg-surface-inset text-text-3',
    secondary: 'border border-border-default bg-surface-2 text-text-1 hover:bg-surface-3',
  },
  client: {
    card: 'border-client-border bg-white',
    title: 'text-client-ink-1',
    body: 'text-client-ink-3',
    muted: 'text-client-ink-3 hover:text-client-ink-1',
    pre: 'border-client-border bg-client-surface-2 text-client-ink-2',
    secondary: 'border border-client-border bg-client-surface-2 text-client-ink-1 hover:bg-white',
  },
} as const

/**
 * A failed lazy chunk means the bundle this tab booted with no longer exists on
 * the server — a deploy happened underneath a long-lived session. Retrying the
 * render cannot fix that; only reloading can, so the copy says so.
 */
function isStaleBundleError(error: Error): boolean {
  const text = `${error.name} ${error.message}`.toLowerCase()
  return (
    text.includes('dynamically imported module') ||
    text.includes('failed to fetch') ||
    text.includes('chunkloaderror') ||
    text.includes('importing a module script failed')
  )
}

const BTN = 'inline-flex h-8 items-center justify-center gap-2 rounded-sm px-3 font-ui text-body-sm font-medium transition-colors duration-150'

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The sanctioned place for console output: a render crash that would
    // otherwise vanish along with the unmounted tree. Carries no user data.
    console.error('Render error caught by boundary:', error, info.componentStack)
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  private reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const { variant = 'panel', theme = 'internal', label } = this.props
    const t = THEME[theme]
    const stale = isStaleBundleError(error)
    const what = label ?? (variant === 'page' ? 'This page' : 'This section')

    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center',
          t.card,
          variant === 'page' ? 'm-8 min-h-80' : 'min-h-40',
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-lg border border-error/20 bg-error/10">
          <AlertTriangle size={18} className="text-error" />
        </div>

        <div className="flex flex-col gap-1">
          <h2 className={cn('font-display text-[15px] font-bold', t.title)}>
            {stale ? 'A new version is available' : `${what} stopped working`}
          </h2>
          <p className={cn('max-w-100 font-ui text-[12.5px]', t.body)}>
            {stale
              ? 'This tab has been open since before the last update, so part of the app is missing. Reloading picks up the current version.'
              : 'Nothing you did caused this, and nothing was lost. The rest of the portal is still usable.'}
          </p>
        </div>

        <div className="mt-1 flex items-center gap-2">
          {!stale && (
            <button type="button" onClick={this.reset} className={cn(BTN, t.secondary)}>
              <RotateCw size={13} /> Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={cn(BTN, 'bg-brand-red text-white hover:bg-brand-red-hover active:bg-brand-red-press')}
          >
            <RefreshCw size={13} /> Reload page
          </button>
        </div>

        {/* Available but never in the way: support asks for it, nobody else reads it. */}
        <details className="mt-1 w-full max-w-140">
          <summary className={cn('cursor-pointer font-mono text-[10.5px] uppercase tracking-wider', t.muted)}>
            Technical details
          </summary>
          <pre className={cn('mt-2 overflow-x-auto rounded-md border p-3 text-left font-mono text-[11px]', t.pre)}>
            {error.message || error.name}
          </pre>
        </details>
      </div>
    )
  }
}
