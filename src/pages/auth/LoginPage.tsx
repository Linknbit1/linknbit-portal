import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  Info,
  LayoutGrid,
  Lock,
  Mail,
  RotateCcw,
} from 'lucide-react'
import { cn } from '../../lib/cn'

type AuthView = 'login' | 'forgot' | 'forgot-sent' | 'splash'
type BootStep = 'done' | 'now' | 'pending'

interface SplashUser {
  initials: string
  name: string
  role: string
  pod: string
  path: string
}

interface DemoAccount extends SplashUser {
  email: string
  label: string
  labelClass: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'ghayas@linknbit.com',
    label: 'Admin',
    labelClass: 'text-brand-red',
    initials: 'GK',
    name: 'Ghayas Karimi',
    role: 'Operations Admin',
    pod: 'Admin pod',
    path: '/admin/dashboard',
  },
  {
    email: 'usman@linknbit.com',
    label: 'Employee',
    labelClass: 'text-service-dev',
    initials: 'UT',
    name: 'Usman Tariq',
    role: 'Lead Developer',
    pod: 'Dev pod',
    path: '/employee/dashboard',
  },
  {
    email: 'imran@cricketsansar.com',
    label: 'Client',
    labelClass: 'text-service-mkt',
    initials: 'IK',
    name: 'Imran Khan',
    role: 'Client',
    pod: 'Cricket Sansar',
    path: '/client/projects',
  },
]

const serviceLegend = [
  { label: 'Design', dotClass: 'bg-service-design' },
  { label: 'Development', dotClass: 'bg-service-dev' },
  { label: 'Marketing', dotClass: 'bg-service-mkt' },
]

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!domain) return email
  return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 4))}@${domain}`
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-sm bg-brand-red font-display font-bold text-white',
        compact ? 'size-6 text-[13px]' : 'size-[30px] text-[16px]',
      )}
    >
      L
    </span>
  )
}

function BrandPanel() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,#0D131D_0%,#0A0F17_100%)] px-16 py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(122,133,151,0.10)_1px,transparent_1px)] bg-[length:32px_32px] bg-[-1px_-1px] opacity-60 [mask-image:radial-gradient(ellipse_80%_65%_at_50%_50%,#000_40%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-6 rounded-sm border border-white/[0.04]" />

      <div className="relative z-10 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="font-display text-[18px] font-bold text-text-1">Linknbit</span>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-4">
          Portal <b className="font-medium text-text-2">v2.0</b> - MAY 2026
        </span>
      </div>

      <div className="relative z-10 mb-6 flex flex-1 flex-col justify-center">
        <div aria-hidden="true" className="relative mb-8 h-80 w-full max-w-120 shrink-0">
          <span className="auth-cross absolute left-0 top-1" />
          <span className="auth-cross absolute bottom-1 right-0" />

          <div className="grid h-full w-full grid-cols-[repeat(40,1fr)] grid-rows-[repeat(37,1fr)] pl-7.5">
            <div className="[grid-area:1/1/24/24] aspect-square rounded-full bg-[radial-gradient(circle_at_35%_35%,#C4B5FD_0%,#8B5CF6_45%,transparent_75%)] opacity-[0.78] mix-blend-screen blur-[2px]" />
            <div className="z-1 aspect-square rounded-full border border-service-design-strong/55 [grid-area:1/1/24/24]">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-service-design">
                <span className="size-1.5 shrink-0 rounded-full bg-service-design" />
                Design
              </span>
            </div>

            <div className="[grid-area:4/16/28/40] aspect-square rounded-full bg-[radial-gradient(circle_at_65%_40%,#67E8F9_0%,#06B6D4_45%,transparent_75%)] opacity-[0.78] mix-blend-screen blur-[2px]" />
            <div className="z-1 aspect-square rounded-full border border-service-dev-strong/55 [grid-area:4/16/28/40]">
              <span className="flex translate-x-15 translate-y-5 items-center justify-end gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-service-dev">
                <span className="size-1.5 shrink-0 rounded-full bg-service-dev" />
                Development
              </span>
            </div>

            <div className="[grid-area:13/7/37/31] aspect-square rounded-full bg-[radial-gradient(circle_at_50%_60%,#FCD34D_0%,#F59E0B_45%,transparent_75%)] opacity-[0.78] mix-blend-screen blur-[2px]" />
            <div className="z-1 flex aspect-square rounded-full border border-service-mkt-strong/55 [grid-area:13/7/37/31]">
              <span className="ml-auto mt-auto flex translate-x-15 -translate-y-5 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-service-mkt">
                <span className="size-1.5 shrink-0 rounded-full bg-service-mkt" />
                Marketing
              </span>
            </div>
          </div>
        </div>

        <h2 className="m-0 font-display text-[clamp(40px,4.5vw,64px)] font-bold leading-[0.92] tracking-[-0.025em] text-text-1">
          Unified
          <br />
          operations<span className="text-brand-red">.</span>
        </h2>
        <p className="mt-5 max-w-[400px] font-ui text-[14.5px] leading-[1.6] text-text-2">
          One workspace for the three sides of Linknbit - design, engineering, and growth. Sign in to
          pick up where your team left off.
        </p>
      </div>

      <div className="relative z-10 flex shrink-0 items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-text-4">
        <div className="flex gap-[18px]">
          {serviceLegend.map((service) => (
            <span key={service.label} className="flex items-center gap-[7px]">
              <span className={cn('size-1.5 shrink-0 rounded-[2px]', service.dotClass)} />
              {service.label}
            </span>
          ))}
        </div>
        <span>
          © 2026 Linknbit - Karachi <b className="font-medium text-text-2">-</b> PKT 14:32
        </span>
      </div>
    </div>
  )
}

function AuthInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  invalid = false,
  icon,
  labelRight,
  rightSlot,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  invalid?: boolean
  icon?: ReactNode
  labelRight?: ReactNode
  rightSlot?: ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="mb-4 flex flex-col gap-[7px]">
      <div className="flex items-baseline justify-between font-ui text-label font-semibold uppercase tracking-[0.08em] text-text-2">
        <span>{label}</span>
        {labelRight}
      </div>
      <div
        className={cn(
          'flex h-[46px] items-center gap-2.5 rounded-sm border bg-surface-inset px-3.5 transition-[border-color,box-shadow]',
          invalid ? 'border-error' : focused ? 'border-brand-red shadow-ring-focus' : 'border-border-default',
        )}
      >
        {icon && <span className="flex shrink-0 items-center text-text-3">{icon}</span>}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-full min-w-0 flex-1 border-0 bg-transparent font-ui text-body text-text-1 outline-none placeholder:text-text-4"
        />
        {rightSlot}
      </div>
    </div>
  )
}

function AuthBtn({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'discord' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-[46px] w-full items-center justify-center gap-2.5 rounded-sm border font-ui text-body font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'border-transparent bg-brand-red shadow-[0_4px_14px_rgba(238,39,55,0.22)] hover:bg-brand-red-hover',
        variant === 'discord' && 'border-transparent bg-[#5865F2] shadow-[0_4px_14px_rgba(88,101,242,0.22)] hover:bg-[#6672f4]',
        variant === 'ghost' && 'border-border-default bg-surface-1 hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  )
}

function LoginForm({ onSuccess, onForgot }: { onSuccess: (user: SplashUser) => void; onForgot: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState(false)
  const [attempts, setAttempts] = useState(0)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const matched = DEMO_ACCOUNTS.find((account) => account.email === email.trim())
    if (matched && password) {
      onSuccess(matched)
    } else {
      setError(true)
      setAttempts((count) => count + 1)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="mb-2 font-display text-[32px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
        Welcome back.
      </h1>
      <p className="mb-7 font-ui text-body leading-[1.55] text-text-3">
        Sign in to your workspace to continue.
      </p>

      {error && (
        <div className="mb-[18px] flex items-start gap-2.5 rounded-sm border border-error-border bg-error-soft px-3.5 py-3">
          <AlertCircle size={16} className="mt-px shrink-0 text-error" />
          <div className="font-ui text-[12.5px] leading-[1.5] text-text-1">
            <strong className="font-semibold text-error">That email and password don't match.</strong>{' '}
            Double-check your credentials or reset your password.
            <span className="mt-1 block font-mono text-[10.5px] tracking-[0.04em] text-text-3">
              Attempt {attempts} of 5 - next try free
            </span>
          </div>
        </div>
      )}

      <AuthInput
        label="Work email"
        type="email"
        value={email}
        onChange={setEmail}
        invalid={error}
        icon={<Mail size={16} strokeWidth={1.75} />}
      />
      <AuthInput
        label="Password"
        type={showPass ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        invalid={error}
        icon={<Lock size={16} strokeWidth={1.75} />}
        labelRight={
          <button type="button" onClick={onForgot} className="bg-transparent p-0 font-ui text-[11.5px] font-medium text-brand-red">
            Forgot password?
          </button>
        }
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPass((visible) => !visible)}
            className="shrink-0 rounded-xs bg-transparent px-2 py-1 font-ui text-label font-semibold uppercase tracking-[0.08em] text-text-3 hover:text-text-2"
          >
            {showPass ? 'Hide' : 'Show'}
          </button>
        }
      />

      <div className="mt-2">
        <AuthBtn type="submit" variant="primary">
          Sign in <ArrowRight size={16} />
        </AuthBtn>
      </div>

      <div className="my-5 flex items-center gap-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-4">
        <span className="h-px flex-1 bg-border-subtle" />
        or continue with
        <span className="h-px flex-1 bg-border-subtle" />
      </div>

      <AuthBtn variant="discord">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.078.078 0 0 0-.083.038c-.18.32-.378.736-.515 1.062a18.27 18.27 0 0 0-5.488 0 12.51 12.51 0 0 0-.523-1.062.08.08 0 0 0-.083-.038c-1.305.225-2.55.62-3.76 1.169a.07.07 0 0 0-.032.027C2.65 8.045 1.997 11.617 2.317 15.145a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 6.002 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.077.077 0 0 0-.041-.106 13.11 13.11 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.292a.075.075 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.06 0a.075.075 0 0 1 .079.009c.12.1.245.199.371.293a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.077.077 0 0 0 .084.028 19.83 19.83 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-4.077-.838-7.62-3.548-10.749a.061.061 0 0 0-.031-.027ZM8.02 13.5c-1.182 0-2.157-1.085-2.157-2.42 0-1.333.957-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.419 0 1.334-.957 2.419-2.157 2.419Zm7.974 0c-1.182 0-2.157-1.085-2.157-2.42 0-1.333.957-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.419 0 1.334-.946 2.419-2.157 2.419Z" />
        </svg>
        Continue with Discord
      </AuthBtn>

      <div className="mt-6 flex items-center gap-2.5 rounded-sm border border-border-subtle bg-surface-1 px-3.5 py-3 font-ui text-caption leading-[1.5] text-text-3">
        <Info size={14} className="shrink-0 text-text-3" />
        <span>
          <strong className="font-semibold text-text-2">Access is invite-only.</strong> Contact your admin if you need an account.
        </span>
      </div>

      <div className="mt-6 border-t border-surface-2 pt-[18px]">
        <p className="mb-2.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-4">
          Prototype - demo accounts
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => onSuccess(account)}
              className="rounded-sm border border-border-default bg-bg-canvas px-2.5 py-2 text-left hover:border-border-strong"
            >
              <p className={cn('mb-0.5 font-display text-label font-bold', account.labelClass)}>
                {account.label}
              </p>
              <p className="font-mono text-[9px] text-text-4">{account.email.split('@')[0]}</p>
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}

function ForgotForm({ onBack, onSent }: { onBack: () => void; onSent: (email: string) => void }) {
  const [email, setEmail] = useState('')
  return (
    <div>
      <h1 className="mb-2 font-display text-[32px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
        Reset your password.
      </h1>
      <p className="mb-7 font-ui text-body leading-[1.55] text-text-3">
        Enter your work email and we'll send you a secure link to reset it.
      </p>
      <AuthInput
        label="Work email"
        type="email"
        value={email}
        onChange={setEmail}
        icon={<Mail size={16} strokeWidth={1.75} />}
      />
      <div className="mt-2">
        <AuthBtn onClick={() => onSent(email || 'user@linknbit.com')} variant="primary">
          Send reset link <ArrowRight size={16} />
        </AuthBtn>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="mt-[22px] inline-flex items-center gap-[7px] rounded-sm bg-transparent py-1.5 pl-1.5 pr-2.5 font-ui text-body-sm text-text-2 hover:text-text-1"
      >
        <ChevronLeft size={14} /> Back to sign in
      </button>
      <div className="mt-7 flex items-center gap-2.5 rounded-sm border border-border-subtle bg-surface-1 px-3.5 py-3 font-ui text-caption leading-[1.5] text-text-3">
        <Info size={14} className="shrink-0 text-text-3" />
        <span>
          Reset links expire after <strong className="font-semibold text-text-2">15 minutes</strong> for security.
        </span>
      </div>
    </div>
  )
}

function ForgotSent({ email, onBack }: { email: string; onBack: () => void }) {
  const [seconds, setSeconds] = useState(54)
  useEffect(() => {
    if (seconds <= 0) return
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  return (
    <div className="pt-[18px] text-center">
      <div className="mb-6 inline-flex size-16 items-center justify-center rounded-lg border border-border-default bg-[linear-gradient(160deg,#1A2433_0%,#131C28_100%)] text-brand-red shadow-[0_0_0_6px_rgba(238,39,55,0.06)]">
        <Mail size={28} strokeWidth={1.75} />
      </div>
      <h1 className="mb-2 font-display text-[32px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
        Check your inbox.
      </h1>
      <p className="m-0 font-ui text-body leading-[1.55] text-text-3">
        If an account exists with this email, you'll receive a reset link within a minute.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-1 px-3 py-1.5 font-mono text-mono text-text-1">
        <span className="size-[5px] shrink-0 rounded-full bg-success" />
        {maskEmail(email)}
      </div>
      <div className="mt-8 flex flex-col gap-2.5">
        <AuthBtn variant="ghost" disabled={seconds > 0}>
          <RotateCcw size={14} />
          Resend link
          {seconds > 0 && <span className="ml-1.5 font-normal text-text-3">- in 0:{String(seconds).padStart(2, '0')}</span>}
        </AuthBtn>
        <button
          type="button"
          onClick={onBack}
          className="mt-1 inline-flex items-center justify-center gap-[7px] rounded-sm bg-transparent px-2.5 py-1.5 font-ui text-body-sm text-text-2 hover:text-text-1"
        >
          <ChevronLeft size={14} /> Back to sign in
        </button>
      </div>
      <div className="mt-7 flex items-center gap-2.5 rounded-sm border border-border-subtle bg-surface-1 px-3.5 py-3 text-left font-ui text-caption leading-[1.5] text-text-3">
        <Info size={14} className="shrink-0 text-text-3" />
        <span>
          Didn't get it? Check spam, or contact <strong className="font-semibold text-text-2">help@linknbit.com</strong>.
        </span>
      </div>
    </div>
  )
}

function BootItem({ status, label, ms }: { status: BootStep; label: string; ms: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-1.5 font-mono text-caption tracking-[0.02em]',
        status === 'pending' ? 'text-text-4' : 'text-text-2',
      )}
    >
      <span
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
          status === 'done' && 'bg-success-soft text-success',
          status === 'now' && 'bg-brand-red/15 text-brand-red',
          status === 'pending' && 'border border-border-default',
        )}
      >
        {status === 'done' && <Check size={10} strokeWidth={3} />}
        {status === 'now' && <span className="auth-checklist-spin" />}
      </span>
      <span className="flex-1">{label}</span>
      <span className="text-label text-text-4">{ms}</span>
    </div>
  )
}

function SplashScreen({ user, onDone }: { user: SplashUser; onDone: () => void }) {
  const [step3, setStep3] = useState<BootStep>('now')
  const [step4, setStep4] = useState<BootStep>('pending')

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStep3('done')
      setStep4('now')
    }, 900)
    const t2 = setTimeout(() => setStep4('done'), 1700)
    const t3 = setTimeout(onDone, 2300)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#0F1620_0%,#06080C_70%)] px-16 py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(122,133,151,0.07)_1px,transparent_1px)] bg-[length:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_30%,transparent_100%)]" />
      <div className="absolute left-8 right-8 top-8 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-4">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="font-display text-[16px] font-bold text-text-1">Linknbit</span>
        </div>
        <div className="flex items-center gap-3.5">
          <span>
            Session <b className="font-medium text-text-2">8a3f-2c91</b>
          </span>
          <span className="flex items-center gap-1.5 text-success">
            <span className="auth-live-dot" />
            Authenticated
          </span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-7 text-center">
        <div className="relative flex size-[132px] items-center justify-center">
          <div className="splash-orbit splash-orbit-mkt" />
          <div className="splash-orbit splash-orbit-design" />
          <div className="splash-orbit splash-orbit-dev" />
          <div className="relative z-3 flex size-[88px] items-center justify-center rounded-full border-2 border-surface-2 bg-[linear-gradient(135deg,#A78BFA,#8B5CF6)] font-display text-[32px] font-bold text-white shadow-[0_0_60px_rgba(167,139,250,0.25)]">
            {user.initials}
          </div>
        </div>

        <div>
          <h1 className="m-0 font-display text-h1 font-bold tracking-[-0.02em] text-text-1">
            <span className="font-medium text-text-3">Welcome,</span> <span>{user.name}</span>
            <span className="text-brand-red">.</span>
          </h1>
          <div className="mt-3.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-2 py-[5px] pl-[5px] pr-3 font-ui text-[12.5px] font-semibold text-text-1">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#A78BFA,#8B5CF6)] text-white">
                <LayoutGrid size={13} />
              </span>
              {user.role} - {user.pod}
            </span>
          </div>
        </div>

        <div className="flex w-[480px] max-w-[90vw] flex-col gap-1 rounded-md border border-border-subtle bg-surface-1/50 px-[22px] py-[18px] text-left backdrop-blur-sm">
          <BootItem status="done" label="Verifying credentials" ms="142ms" />
          <BootItem status="done" label="Loading role permissions" ms="87ms" />
          <BootItem status={step3} label="Syncing your projects from ClickUp" ms={step3 === 'now' ? '...' : '203ms'} />
          <BootItem status={step4} label="Preparing your dashboard" ms={step4 === 'pending' ? 'queued' : step4 === 'now' ? '...' : 'ready'} />
        </div>

        <div className="relative h-1 w-[480px] max-w-[90vw] overflow-hidden rounded-full bg-surface-inset">
          <div className="splash-progress-fill" />
        </div>

        <div className="flex items-center gap-2.5 font-mono text-caption tracking-[0.04em] text-text-3">
          <span>Setting up your workspace</span>
          <span className="inline-flex gap-1">
            <span className="auth-typing-dot" />
            <span className="auth-typing-dot" />
            <span className="auth-typing-dot" />
            <span className="auth-typing-dot" />
          </span>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<AuthView>('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [splashUser, setSplashUser] = useState<SplashUser | null>(null)

  function triggerSplash(user: SplashUser) {
    setSplashUser(user)
    setView('splash')
  }

  return (
    <>
      {view === 'splash' && splashUser && <SplashScreen user={splashUser} onDone={() => navigate(splashUser.path)} />}

      <div className="flex min-h-screen bg-bg-base">
        <div className="hidden shrink-0 lg:block lg:w-1/2">
          <BrandPanel />
        </div>

        <div className="flex min-h-screen flex-1 flex-col bg-bg-base">
          <div className="flex shrink-0 items-center justify-between px-6 pt-8 sm:px-10 sm:pt-10 lg:px-20 lg:pt-14">
            <div className="flex items-center gap-2.5">
              <LogoMark compact />
              <span className="font-display text-body font-semibold text-text-2">Operations Portal</span>
            </div>
            <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-4 sm:block">
              Need help? help@linknbit.com
            </span>
          </div>

          <div className="px-6 pb-4 pt-8 sm:px-10 lg:hidden">
            <div className="flex items-center gap-4 rounded-md border border-border-subtle bg-[linear-gradient(135deg,#0D131D_0%,#0A0F17_100%)] px-5 py-4">
              <div className="relative size-14 shrink-0">
                <span className="absolute left-0 top-0 size-9 rounded-full bg-[radial-gradient(circle_at_35%_35%,#C4B5FD_0%,#8B5CF6_45%,transparent_75%)] opacity-80 mix-blend-screen blur-[1px]" />
                <span className="absolute left-3 top-2.5 size-9 rounded-full bg-[radial-gradient(circle_at_65%_40%,#67E8F9_0%,#06B6D4_45%,transparent_75%)] opacity-80 mix-blend-screen blur-[1px]" />
                <span className="absolute left-1.5 top-[18px] size-9 rounded-full bg-[radial-gradient(circle_at_50%_60%,#FCD34D_0%,#F59E0B_45%,transparent_75%)] opacity-80 mix-blend-screen blur-[1px]" />
              </div>
              <div>
                <p className="m-0 font-display text-[16px] font-bold tracking-[-0.015em] text-text-1">
                  Unified operations<span className="text-brand-red">.</span>
                </p>
                <p className="mt-0.5 font-ui text-caption text-text-3">Design - Development - Marketing</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10 lg:px-20">
            <div className="w-full max-w-[400px]">
              {view === 'login' && <LoginForm onSuccess={triggerSplash} onForgot={() => setView('forgot')} />}
              {view === 'forgot' && (
                <ForgotForm
                  onBack={() => setView('login')}
                  onSent={(email) => {
                    setForgotEmail(email)
                    setView('forgot-sent')
                  }}
                />
              )}
              {view === 'forgot-sent' && <ForgotSent email={forgotEmail} onBack={() => setView('login')} />}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between px-6 pb-8 font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-4 sm:px-10 sm:pb-10 lg:px-20 lg:pb-14">
            <span>Linknbit - Operations Portal</span>
            <span className="hidden sm:block">EN - KARACHI - PKT</span>
          </div>
        </div>
      </div>
    </>
  )
}
