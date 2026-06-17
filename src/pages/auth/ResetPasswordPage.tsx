import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Loader2, ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { supabase } from '../../lib/supabase'
import { updatePassword } from '../../api/auth'
import { useAuthContext } from '../../context/AuthContext'
import { LinknbitMark } from '../../components/brand/LinknbitLogo'

type Status = 'verifying' | 'ready' | 'invalid' | 'saving' | 'done'

/**
 * Lands invited users (type=invite) and password-reset users (type=recovery)
 * after they click the email link. Supabase's `detectSessionInUrl` captures the
 * session from the URL hash; this page lets them set a password, then signs them
 * in through the BFF so they arrive logged in.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthContext()

  const [status, setStatus] = useState<Status>('verifying')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Wait for the session that `detectSessionInUrl` extracts from the link.
  useEffect(() => {
    let mounted = true
    const markReady = (sessionEmail?: string | null) => {
      if (!mounted) return
      if (sessionEmail) setEmail(sessionEmail)
      setStatus((s) => (s === 'verifying' ? 'ready' : s))
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady(data.session.user.email)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) markReady(session.user.email)
    })
    // No session captured within a few seconds → the link is invalid or expired.
    const timeout = setTimeout(() => {
      if (mounted) setStatus((s) => (s === 'verifying' ? 'invalid' : s))
    }, 6000)

    return () => { mounted = false; sub.subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  const isStrong = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
  const mismatch = confirm.length > 0 && confirm !== password
  const strengthLabel = password.length === 0 ? null : isStrong ? 'Strong' : password.length >= 8 ? 'Fair' : 'Weak'
  const strengthColor = strengthLabel === 'Strong' ? 'text-success' : strengthLabel === 'Fair' ? 'text-service-mkt' : 'text-error'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isStrong || mismatch || status === 'saving') return
    setStatus('saving')
    setError(null)
    try {
      await updatePassword(password)
      // Establish the app's BFF cookie session so they land logged in directly.
      if (email) {
        try {
          await signIn(email, password)
          navigate('/dashboard', { replace: true })
          return
        } catch { /* fall through — they can sign in manually */ }
      }
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set your password. Please try again.')
      setStatus('ready')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-base px-[max(env(safe-area-inset-left),1.5rem)] py-[max(env(safe-area-inset-top),2.5rem)]">
      <div className="w-full max-w-100">
        <div className="mb-8 flex items-center gap-2.5">
          <LinknbitMark surface="dark" className="h-8 w-7" />
          <span className="font-display text-body font-semibold text-text-2">Operations Portal</span>
        </div>

        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Loader2 size={26} className="animate-spin text-brand-red" />
            <p className="font-ui text-body text-text-3">Verifying your link…</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="flex flex-col gap-5">
            <div className="flex size-14 items-center justify-center rounded-lg border border-border-default bg-[linear-gradient(160deg,#1A2433_0%,#131C28_100%)] text-error shadow-[0_0_0_6px_rgba(238,39,55,0.06)]">
              <AlertCircle size={26} strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="mb-2 font-display text-[28px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
                This link isn't valid.
              </h1>
              <p className="font-ui text-body leading-[1.55] text-text-3">
                It may have expired or already been used. Request a new one from the sign-in page using “Forgot password”.
              </p>
            </div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="inline-flex h-11.5 w-full items-center justify-center gap-2.5 rounded-sm bg-brand-red font-ui text-body font-semibold text-white shadow-[0_4px_14px_rgba(238,39,55,0.22)] transition-colors hover:bg-brand-red-hover"
            >
              Back to sign in <ArrowRight size={16} />
            </button>
          </div>
        )}

        {status === 'done' && (
          <div className="flex flex-col gap-5">
            <div className="flex size-14 items-center justify-center rounded-lg border border-border-default bg-[linear-gradient(160deg,#1A2433_0%,#131C28_100%)] text-success shadow-[0_0_0_6px_rgba(34,197,94,0.06)]">
              <ShieldCheck size={26} strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="mb-2 font-display text-[28px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
                Password set.
              </h1>
              <p className="font-ui text-body leading-[1.55] text-text-3">
                Your password has been saved. Sign in to continue.
              </p>
            </div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="inline-flex h-11.5 w-full items-center justify-center gap-2.5 rounded-sm bg-brand-red font-ui text-body font-semibold text-white shadow-[0_4px_14px_rgba(238,39,55,0.22)] transition-colors hover:bg-brand-red-hover"
            >
              Go to sign in <ArrowRight size={16} />
            </button>
          </div>
        )}

        {(status === 'ready' || status === 'saving') && (
          <form onSubmit={handleSubmit}>
            <div className="mb-6 flex size-14 items-center justify-center rounded-lg border border-border-default bg-[linear-gradient(160deg,#1A2433_0%,#131C28_100%)] text-success shadow-[0_0_0_6px_rgba(34,197,94,0.06)]">
              <ShieldCheck size={26} strokeWidth={1.75} />
            </div>

            <h1 className="mb-2 font-display text-[28px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
              Set your password.
            </h1>
            <p className="mb-7 font-ui text-body leading-[1.55] text-text-3">
              {email ? <>Choose a password for <span className="font-semibold text-text-2">{email}</span>.</> : 'Choose a strong password for your account.'}
            </p>

            {error && (
              <div className="mb-4 flex items-start gap-2.5 rounded-sm border border-error-border bg-error-soft px-3.5 py-3">
                <AlertCircle size={16} className="mt-px shrink-0 text-error" />
                <p className="font-ui text-[12.5px] leading-normal text-text-1">{error}</p>
              </div>
            )}

            <div className="mb-4 flex flex-col gap-1.75">
              <div className="flex items-baseline justify-between font-ui text-label font-semibold uppercase tracking-[0.08em] text-text-2">
                <span>New password</span>
                {strengthLabel && <span className={cn('font-ui text-[11.5px] font-medium normal-case tracking-normal', strengthColor)}>{strengthLabel}</span>}
              </div>
              <div className="flex h-11.5 items-center gap-2.5 rounded-sm border border-border-default bg-surface-inset px-3.5 focus-within:border-brand-red focus-within:shadow-ring-focus">
                <Lock size={16} strokeWidth={1.75} className="shrink-0 text-text-3" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent font-ui text-body text-text-1 outline-none placeholder:text-text-4"
                  placeholder="At least 8 characters"
                />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="shrink-0 rounded-xs px-2 py-1 text-text-3 hover:text-text-2">
                  {showPass ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-1.75">
              <span className="font-ui text-label font-semibold uppercase tracking-[0.08em] text-text-2">Confirm password</span>
              <div className={cn('flex h-11.5 items-center gap-2.5 rounded-sm border bg-surface-inset px-3.5', mismatch ? 'border-error' : 'border-border-default focus-within:border-brand-red focus-within:shadow-ring-focus')}>
                <Lock size={16} strokeWidth={1.75} className="shrink-0 text-text-3" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent font-ui text-body text-text-1 outline-none placeholder:text-text-4"
                  placeholder="Re-enter your password"
                />
              </div>
              {mismatch && <p className="font-ui text-[12px] text-error">Passwords don't match.</p>}
            </div>

            <button
              type="submit"
              disabled={!isStrong || mismatch || status === 'saving'}
              className="mt-2 inline-flex h-11.5 w-full items-center justify-center gap-2.5 rounded-sm bg-brand-red font-ui text-body font-semibold text-white shadow-[0_4px_14px_rgba(238,39,55,0.22)] transition-colors hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'saving' ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <>Set password & continue <ArrowRight size={16} /></>}
            </button>

            <p className="mt-6 font-ui text-caption/normal text-text-3">
              Use at least <strong className="font-semibold text-text-2">8 characters</strong> with a capital letter and a number.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
