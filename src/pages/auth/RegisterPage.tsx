import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { supabase } from '../../lib/supabase'
import { useUpdatePassword } from '../../hooks/useAuth'

function AuthInput({
  label,
  type = 'text',
  value,
  onChange,
  invalid = false,
  icon,
  labelRight,
  rightSlot,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  invalid?: boolean
  icon?: ReactNode
  labelRight?: ReactNode
  rightSlot?: ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="mb-4 flex flex-col gap-1.75">
      <div className="flex items-baseline justify-between font-ui text-label font-semibold uppercase tracking-[0.08em] text-text-2">
        <span>{label}</span>
        {labelRight}
      </div>
      <div
        className={cn(
          'flex h-11.5 items-center gap-2.5 rounded-sm border bg-surface-inset px-3.5 transition-[border-color,box-shadow]',
          invalid
            ? 'border-error'
            : focused
              ? 'border-brand-red shadow-ring-focus'
              : 'border-border-default',
        )}
      >
        {icon && <span className="flex shrink-0 items-center text-text-3">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-full min-w-0 flex-1 border-0 bg-transparent font-ui text-body text-text-1 outline-none placeholder:text-text-4"
        />
        {rightSlot}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const updatePassword = useUpdatePassword()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [done, setDone] = useState(false)
  // Check for invite session directly from Supabase client (detectSessionInUrl handles the URL token)
  const [inviteSession, setInviteSession] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setInviteSession(!!data.session)
    })
  }, [])

  const loading = inviteSession === null
  const session = inviteSession

  const isStrong =
    password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
  const mismatch = confirm.length > 0 && confirm !== password

  const strengthLabel =
    password.length === 0 ? null : isStrong ? 'Strong' : password.length >= 6 ? 'Fair' : 'Weak'
  const strengthColor =
    strengthLabel === 'Strong'
      ? 'text-success'
      : strengthLabel === 'Fair'
        ? 'text-service-mkt'
        : 'text-error'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isStrong || password !== confirm) return
    updatePassword.mutate(password, {
      onSuccess: () => setDone(true),
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="size-8 animate-spin rounded-full border-2 border-surface-2 border-t-brand-red" />
      </div>
    )
  }

  // No session means the invite link was invalid or already used
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base px-6">
        <div className="w-full max-w-100 text-center">
          <div className="mb-6 flex size-14 items-center justify-center rounded-lg border border-error-border bg-error-soft mx-auto">
            <AlertCircle size={26} className="text-error" />
          </div>
          <h1 className="mb-3 font-display text-[28px] font-bold tracking-[-0.018em] text-text-1">
            Invite link expired.
          </h1>
          <p className="mb-6 font-ui text-body leading-[1.55] text-text-3">
            This invite link is invalid or has already been used. Contact your admin for a new
            invitation.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex h-11.5 w-full items-center justify-center gap-2.5 rounded-sm border border-transparent bg-brand-red font-ui text-body font-semibold text-white hover:bg-brand-red-hover transition-colors"
          >
            Back to sign in <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base px-6">
        <div className="w-full max-w-100 text-center">
          <div className="mb-6 flex size-14 items-center justify-center rounded-lg border border-border-default bg-[linear-gradient(160deg,#1A2433_0%,#131C28_100%)] text-success shadow-[0_0_0_6px_rgba(34,197,94,0.06)] mx-auto">
            <ShieldCheck size={26} strokeWidth={1.75} />
          </div>
          <h1 className="mb-3 font-display text-[28px] font-bold tracking-[-0.018em] text-text-1">
            Password set.
          </h1>
          <p className="mb-6 font-ui text-body leading-[1.55] text-text-3">
            Your account is ready. You'll be redirected to your workspace in a moment.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex h-11.5 w-full items-center justify-center gap-2.5 rounded-sm border border-transparent bg-brand-red font-ui text-body font-semibold text-white hover:bg-brand-red-hover transition-colors"
          >
            Go to workspace <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-6">
      <div className="w-full max-w-100">
        <form onSubmit={handleSubmit}>
          <div className="mb-6 flex size-14 items-center justify-center rounded-lg border border-border-default bg-[linear-gradient(160deg,#1A2433_0%,#131C28_100%)] text-brand-red shadow-[0_0_0_6px_rgba(238,39,55,0.06)]">
            <ShieldCheck size={26} strokeWidth={1.75} />
          </div>

          <h1 className="mb-2 font-display text-[32px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
            Set your password.
          </h1>
          <p className="mb-7 font-ui text-body leading-[1.55] text-text-3">
            You've been invited to Linknbit Operations Portal. Choose a strong password to activate
            your account.
          </p>

          {updatePassword.isError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-sm border border-error-border bg-error-soft px-3.5 py-3">
              <AlertCircle size={16} className="mt-px shrink-0 text-error" />
              <p className="font-ui text-[12.5px] leading-normal text-text-1">
                {(updatePassword.error as Error).message ?? 'Could not set password. Try again.'}
              </p>
            </div>
          )}

          <AuthInput
            label="New password"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            icon={<Lock size={16} strokeWidth={1.75} />}
            labelRight={
              strengthLabel ? (
                <span className={cn('font-ui text-[11.5px] font-medium', strengthColor)}>
                  {strengthLabel}
                </span>
              ) : undefined
            }
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="shrink-0 rounded-xs bg-transparent px-2 py-1 text-text-3 hover:text-text-2"
              >
                {showPass ? (
                  <EyeOff size={15} strokeWidth={1.75} />
                ) : (
                  <Eye size={15} strokeWidth={1.75} />
                )}
              </button>
            }
          />

          <AuthInput
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            invalid={mismatch}
            icon={<Lock size={16} strokeWidth={1.75} />}
          />
          {mismatch && (
            <p className="-mt-2 mb-4 font-ui text-[12px] text-error">Passwords don't match.</p>
          )}

          <div className="mt-2">
            <button
              type="submit"
              disabled={!isStrong || mismatch || password !== confirm || updatePassword.isPending}
              className="inline-flex h-11.5 w-full items-center justify-center gap-2.5 rounded-sm border border-transparent bg-brand-red font-ui text-body font-semibold text-white shadow-[0_4px_14px_rgba(238,39,55,0.22)] hover:bg-brand-red-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updatePassword.isPending ? 'Activating…' : <>Activate account <ArrowRight size={16} /></>}
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2.5 rounded-sm border border-border-subtle bg-surface-1 px-3.5 py-3 font-ui text-caption/normal text-text-3">
            <ShieldCheck size={14} className="shrink-0 text-text-3" />
            <span>
              Use at least{' '}
              <strong className="font-semibold text-text-2">8 characters</strong> with a capital
              letter and a number.
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}
