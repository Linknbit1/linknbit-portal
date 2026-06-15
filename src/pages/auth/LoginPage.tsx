import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  Info,
  LayoutGrid,
  Lock,
  Mail,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useSignIn, useSendOtp, useVerifyOtp, useUpdatePassword } from '../../hooks/useAuth'
import { LinknbitMark } from '../../components/brand/LinknbitLogo'

type AuthView = 'login' | 'forgot' | 'otp' | 'new-password' | 'splash'
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
  password: string
  label: string
  labelClass: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'ghayasleo99@gmail.com',
    password: '@@0Ghayas!!!',
    label: 'Admin',
    labelClass: 'text-brand-red',
    initials: 'GU',
    name: 'Ghayas Ud Din',
    role: 'Operations Admin',
    pod: 'Admin',
    path: '/dashboard',
  },
  {
    email: 'super.admin@linknbit.com',
    password: 'Linknbit@123',
    label: 'Super Admin',
    labelClass: 'text-brand-red',
    initials: 'AR',
    name: 'Ahmad Raza',
    role: 'Super Admin',
    pod: 'Admin',
    path: '/dashboard',
  },
  {
    email: 'project.manager@linknbit.com',
    password: 'Linknbit@123',
    label: 'Proj. Manager',
    labelClass: 'text-service-dev',
    initials: 'ZM',
    name: 'Zain Malik',
    role: 'Project Manager',
    pod: 'Dev pod',
    path: '/dashboard',
  },
  {
    email: 'team.lead@linknbit.com',
    password: 'Linknbit@123',
    label: 'Team Lead',
    labelClass: 'text-service-dev',
    initials: 'SQ',
    name: 'Sara Qureshi',
    role: 'Team Lead',
    pod: 'Dev pod',
    path: '/dashboard',
  },
  {
    email: 'employee@linknbit.com',
    password: 'Linknbit@123',
    label: 'Employee',
    labelClass: 'text-service-dev',
    initials: 'BA',
    name: 'Bilal Ahmed',
    role: 'Employee',
    pod: 'Dev pod',
    path: '/dashboard',
  },
  {
    email: 'hr@linknbit.com',
    password: 'Linknbit@123',
    label: 'HR',
    labelClass: 'text-service-design',
    initials: 'HR',
    name: 'Hina Rizvi',
    role: 'HR Manager',
    pod: 'People',
    path: '/dashboard',
  },
  {
    email: 'finance@linknbit.com',
    password: 'Linknbit@123',
    label: 'Finance',
    labelClass: 'text-service-mkt',
    initials: 'UT',
    name: 'Usman Tariq',
    role: 'Finance',
    pod: 'Finance',
    path: '/dashboard',
  },
  {
    email: 'client.owner@cricketsansar.com',
    password: 'Linknbit@123',
    label: 'Client Owner',
    labelClass: 'text-service-mkt',
    initials: 'RG',
    name: 'Rahim Gul',
    role: 'Client Owner',
    pod: 'Cricket Sansar',
    path: '/client/dashboard',
  },
  {
    email: 'client.member@cricketsansar.com',
    password: 'Linknbit@123',
    label: 'Client Member',
    labelClass: 'text-service-mkt',
    initials: 'IT',
    name: 'Irene Teo',
    role: 'Client Member',
    pod: 'Cricket Sansar',
    path: '/client/dashboard',
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

function getPktTime() {
  const now = new Date()
  const pktOffset = 5 * 60
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const pkt = new Date(utc + pktOffset * 60000)
  const h = String(pkt.getHours()).padStart(2, '0')
  const m = String(pkt.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function getCurrentMonthYear() {
  const now = new Date()
  const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = now.getFullYear()
  return `${month} ${year}`
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <LinknbitMark surface="dark" className={compact ? 'h-7 w-6' : 'h-8 w-7'} />
  )
}

function BrandPanel() {
  const [time, setTime] = useState(getPktTime)

  useEffect(() => {
    const id = setInterval(() => setTime(getPktTime()), 30000)
    return () => clearInterval(id)
  }, [])

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
          Portal <b className="font-medium text-text-2">v2.0</b> - {getCurrentMonthYear()}
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
          © {new Date().getFullYear()} Linknbit - Islamabad <b className="font-medium text-text-2">-</b> PKT {time}
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

function AuthBtn({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost'
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
        variant === 'ghost' && 'border-border-default bg-surface-1 hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  )
}

function OtpBoxes({
  value,
  onChange,
  invalid = false,
}: {
  value: string[]
  onChange: (v: string[]) => void
  invalid?: boolean
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[index] = digit
    onChange(next)
    if (digit && index < 5) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = Array(6).fill('')
    digits.split('').forEach((d, i) => { next[i] = d })
    onChange(next)
    const focusIdx = Math.min(digits.length, 5)
    refs.current[focusIdx]?.focus()
  }

  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(node) => { refs.current[i] = node }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={cn(
            'size-12 rounded-sm border bg-surface-inset text-center font-mono text-[22px] font-bold text-text-1 outline-none transition-[border-color,box-shadow] caret-transparent selection:bg-transparent',
            invalid
              ? 'border-error'
              : 'border-border-default focus:border-brand-red focus:shadow-ring-focus',
          )}
        />
      ))}
    </div>
  )
}

function LoginForm({
  onSuccess,
  onForgot,
}: {
  onSuccess: (user: SplashUser) => void
  onForgot: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const signIn = useSignIn()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    signIn.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          const demo = DEMO_ACCOUNTS.find((a) => a.email === email.trim())
          onSuccess(
            demo ?? {
              initials: email.slice(0, 2).toUpperCase(),
              name: email.split('@')[0],
              role: 'Team Member',
              pod: 'Linknbit',
              path: '/dashboard',
            },
          )
        },
        onError: () => setAttempts((n) => n + 1),
      },
    )
  }

  const hasError = signIn.isError

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="mb-2 font-display text-[32px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
        Welcome back.
      </h1>
      <p className="mb-7 font-ui text-body leading-[1.55] text-text-3">
        Sign in to your workspace to continue.
      </p>

      {hasError && (
        <div className="mb-[18px] flex items-start gap-2.5 rounded-sm border border-error-border bg-error-soft px-3.5 py-3">
          <AlertCircle size={16} className="mt-px shrink-0 text-error" />
          <div className="font-ui text-[12.5px] leading-[1.5] text-text-1">
            <strong className="font-semibold text-error">That email and password don't match.</strong>{' '}
            Double-check your credentials or reset your password.
            <span className="mt-1 block font-mono text-[10.5px] tracking-[0.04em] text-text-3">
              Attempt {attempts} of 5 — next try free
            </span>
          </div>
        </div>
      )}

      <AuthInput
        label="Work email"
        type="email"
        value={email}
        onChange={setEmail}
        invalid={hasError}
        icon={<Mail size={16} strokeWidth={1.75} />}
      />
      <AuthInput
        label="Password"
        type={showPass ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        invalid={hasError}
        icon={<Lock size={16} strokeWidth={1.75} />}
        labelRight={
          <button
            type="button"
            onClick={onForgot}
            className="bg-transparent p-0 font-ui text-[11.5px] font-medium text-brand-red"
          >
            Forgot password?
          </button>
        }
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="shrink-0 rounded-xs bg-transparent px-2 py-1 text-text-3 hover:text-text-2"
          >
            {showPass ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
          </button>
        }
      />

      <div className="mt-2">
        <AuthBtn type="submit" variant="primary" disabled={signIn.isPending}>
          {signIn.isPending ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
        </AuthBtn>
      </div>

      <div className="mt-6 flex items-center gap-2.5 rounded-sm border border-border-subtle bg-surface-1 px-3.5 py-3 font-ui text-caption leading-[1.5] text-text-3">
        <Info size={14} className="shrink-0 text-text-3" />
        <span>
          <strong className="font-semibold text-text-2">Access is invite-only.</strong> Contact your admin if you need an account.
        </span>
      </div>

      <div className="mt-6 border-t border-surface-2 pt-[18px]">
        <p className="mb-2.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-4">
          Prototype — demo accounts
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email)
                setPassword(account.password)
              }}
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

function ForgotForm({
  onBack,
  onSent,
}: {
  onBack: () => void
  onSent: (email: string) => void
}) {
  const [email, setEmail] = useState('')
  const sendOtp = useSendOtp()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendOtp.mutate(email.trim(), {
      onSuccess: () => onSent(email.trim()),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="mb-2 font-display text-[32px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
        Reset your password.
      </h1>
      <p className="mb-7 font-ui text-body leading-[1.55] text-text-3">
        Enter your work email and we'll send you a 6-digit code to reset it.
      </p>

      {sendOtp.isError && (
        <div className="mb-[18px] flex items-start gap-2.5 rounded-sm border border-error-border bg-error-soft px-3.5 py-3">
          <AlertCircle size={16} className="mt-px shrink-0 text-error" />
          <p className="font-ui text-[12.5px] leading-[1.5] text-text-1">
            {(sendOtp.error as Error).message ?? 'Could not send code. Try again.'}
          </p>
        </div>
      )}

      <AuthInput
        label="Work email"
        type="email"
        value={email}
        onChange={setEmail}
        invalid={sendOtp.isError}
        icon={<Mail size={16} strokeWidth={1.75} />}
      />
      <div className="mt-2">
        <AuthBtn type="submit" variant="primary" disabled={sendOtp.isPending || !email}>
          {sendOtp.isPending ? 'Sending…' : <>Send OTP code <ArrowRight size={16} /></>}
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
          Codes expire after <strong className="font-semibold text-text-2">10 minutes</strong> for security.
        </span>
      </div>
    </form>
  )
}

function OtpView({
  email,
  onVerified,
  onChangeEmail,
}: {
  email: string
  onVerified: () => void
  onChangeEmail: () => void
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [seconds, setSeconds] = useState(60)
  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp()

  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  const token = digits.join('')
  const isFilled = token.length === 6

  function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    verifyOtp.mutate(
      { email, token },
      { onSuccess: onVerified },
    )
  }

  function handleResend() {
    sendOtp.mutate(email, {
      onSuccess: () => {
        setDigits(Array(6).fill(''))
        setSeconds(60)
        verifyOtp.reset()
      },
    })
  }

  const hasError = verifyOtp.isError

  return (
    <form onSubmit={handleVerify}>
      <div className="mb-6 flex size-14 items-center justify-center rounded-lg border border-border-default bg-[linear-gradient(160deg,#1A2433_0%,#131C28_100%)] text-brand-red shadow-[0_0_0_6px_rgba(238,39,55,0.06)]">
        <ShieldCheck size={26} strokeWidth={1.75} />
      </div>

      <h1 className="mb-2 font-display text-[32px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
        Enter your code.
      </h1>
      <p className="mb-1 font-ui text-body leading-[1.55] text-text-3">
        We sent a 6-digit code to
      </p>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-1 px-3 py-1.5 font-mono text-mono text-text-1">
        <span className="size-[5px] shrink-0 rounded-full bg-success" />
        {maskEmail(email)}
      </div>

      {hasError && (
        <div className="mb-4 flex items-start gap-2.5 rounded-sm border border-error-border bg-error-soft px-3.5 py-3">
          <AlertCircle size={16} className="mt-px shrink-0 text-error" />
          <p className="font-ui text-[12.5px] leading-[1.5] text-text-1">
            Invalid or expired code. Check your email and try again.
          </p>
        </div>
      )}

      <div className="mb-6">
        <OtpBoxes value={digits} onChange={setDigits} invalid={hasError} />
      </div>

      <div className="flex flex-col gap-2.5">
        <AuthBtn type="submit" variant="primary" disabled={!isFilled || verifyOtp.isPending}>
          {verifyOtp.isPending ? 'Verifying…' : <>Verify code <ArrowRight size={16} /></>}
        </AuthBtn>
        <AuthBtn
          variant="ghost"
          disabled={seconds > 0 || sendOtp.isPending}
          onClick={handleResend}
        >
          <RotateCcw size={14} />
          {seconds > 0
            ? <>Resend code <span className="ml-1 font-normal text-text-3">in 0:{String(seconds).padStart(2, '0')}</span></>
            : sendOtp.isPending ? 'Sending…' : 'Resend code'}
        </AuthBtn>
        <button
          type="button"
          onClick={onChangeEmail}
          className="mt-1 inline-flex items-center justify-center gap-[7px] bg-transparent px-2.5 py-1.5 font-ui text-body-sm text-text-2 hover:text-text-1"
        >
          <ChevronLeft size={14} /> Change email
        </button>
      </div>

      <div className="mt-6 flex items-center gap-2.5 rounded-sm border border-border-subtle bg-surface-1 px-3.5 py-3 font-ui text-caption leading-[1.5] text-text-3">
        <Info size={14} className="shrink-0 text-text-3" />
        <span>
          Didn't get it? Check spam, or contact{' '}
          <strong className="font-semibold text-text-2">help@linknbit.com</strong>.
        </span>
      </div>
    </form>
  )
}

function NewPasswordView({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const updatePassword = useUpdatePassword()

  const isStrong = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
  const mismatch = confirm.length > 0 && confirm !== password

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isStrong || mismatch) return
    updatePassword.mutate(password, { onSuccess: onDone })
  }

  const strengthLabel = password.length === 0 ? null : isStrong ? 'Strong' : password.length >= 8 ? 'Fair' : 'Weak'
  const strengthColor = strengthLabel === 'Strong' ? 'text-success' : strengthLabel === 'Fair' ? 'text-service-mkt' : 'text-error'

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6 flex size-14 items-center justify-center rounded-lg border border-border-default bg-[linear-gradient(160deg,#1A2433_0%,#131C28_100%)] text-success shadow-[0_0_0_6px_rgba(34,197,94,0.06)]">
        <ShieldCheck size={26} strokeWidth={1.75} />
      </div>

      <h1 className="mb-2 font-display text-[32px] font-bold leading-[1.15] tracking-[-0.018em] text-text-1">
        Set new password.
      </h1>
      <p className="mb-7 font-ui text-body leading-[1.55] text-text-3">
        Choose a strong password for your account.
      </p>

      {updatePassword.isError && (
        <div className="mb-4 flex items-start gap-2.5 rounded-sm border border-error-border bg-error-soft px-3.5 py-3">
          <AlertCircle size={16} className="mt-px shrink-0 text-error" />
          <p className="font-ui text-[12.5px] leading-[1.5] text-text-1">
            {(updatePassword.error as Error).message ?? 'Could not update password. Try again.'}
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
            {showPass ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
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
        <AuthBtn
          type="submit"
          variant="primary"
          disabled={!isStrong || mismatch || password !== confirm || updatePassword.isPending}
        >
          {updatePassword.isPending ? 'Saving…' : <>Set new password <ArrowRight size={16} /></>}
        </AuthBtn>
      </div>

      <div className="mt-6 flex items-center gap-2.5 rounded-sm border border-border-subtle bg-surface-1 px-3.5 py-3 font-ui text-caption leading-[1.5] text-text-3">
        <Info size={14} className="shrink-0 text-text-3" />
        <span>
          Use at least <strong className="font-semibold text-text-2">8 characters</strong> with a capital letter and a number.
        </span>
      </div>
    </form>
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
    const t1 = setTimeout(() => { setStep3('done'); setStep4('now') }, 900)
    const t2 = setTimeout(() => setStep4('done'), 1700)
    const t3 = setTimeout(onDone, 2300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#0F1620_0%,#06080C_70%)] px-[clamp(16px,5vw,64px)] py-[clamp(20px,4vh,56px)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(122,133,151,0.07)_1px,transparent_1px)] bg-[length:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_30%,transparent_100%)]" />
      <div className="absolute left-[clamp(16px,5vw,32px)] right-[clamp(16px,5vw,32px)] top-[clamp(16px,3vh,32px)] flex items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-4">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="font-display text-[16px] font-bold text-text-1">Linknbit</span>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="hidden sm:inline">
            Session <b className="font-medium text-text-2">8a3f-2c91</b>
          </span>
          <span className="flex items-center gap-1.5 text-success">
            <span className="auth-live-dot" />
            Authenticated
          </span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-[clamp(18px,3.5vh,28px)] text-center">
        <div className="relative flex size-[clamp(104px,24vw,132px)] items-center justify-center">
          <div className="splash-orbit splash-orbit-mkt" />
          <div className="splash-orbit splash-orbit-design" />
          <div className="splash-orbit splash-orbit-dev" />
          <div className="relative z-3 flex size-[clamp(68px,16vw,88px)] items-center justify-center rounded-full border-2 border-surface-2 bg-[linear-gradient(135deg,#A78BFA,#8B5CF6)] font-display text-[clamp(24px,6vw,32px)] font-bold text-white shadow-[0_0_60px_rgba(167,139,250,0.25)]">
            {user.initials}
          </div>
        </div>

        <div>
          <h1 className="m-0 font-display text-[clamp(24px,6vw,34px)] font-bold leading-[1.1] tracking-[-0.02em] text-text-1">
            <span className="font-medium text-text-3">Welcome,</span> <span>{user.name}</span>
            <span className="text-brand-red">.</span>
          </h1>
          <div className="mt-[clamp(10px,2vh,14px)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-2 py-[5px] pl-[5px] pr-3 font-ui text-[12.5px] font-semibold text-text-1">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#A78BFA,#8B5CF6)] text-white">
                <LayoutGrid size={13} />
              </span>
              {user.role} - {user.pod}
            </span>
          </div>
        </div>

        <div className="flex w-[480px] max-w-[90vw] flex-col gap-1 rounded-md border border-border-subtle bg-surface-1/50 px-[clamp(16px,4vw,22px)] py-[clamp(14px,2.5vh,18px)] text-left backdrop-blur-sm">
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
      {view === 'splash' && splashUser && (
        <SplashScreen user={splashUser} onDone={() => navigate(splashUser.path)} />
      )}

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
              {view === 'login' && (
                <LoginForm onSuccess={triggerSplash} onForgot={() => setView('forgot')} />
              )}
              {view === 'forgot' && (
                <ForgotForm
                  onBack={() => setView('login')}
                  onSent={(email) => { setForgotEmail(email); setView('otp') }}
                />
              )}
              {view === 'otp' && (
                <OtpView
                  email={forgotEmail}
                  onVerified={() => setView('new-password')}
                  onChangeEmail={() => setView('forgot')}
                />
              )}
              {view === 'new-password' && (
                <NewPasswordView onDone={() => setView('login')} />
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between px-6 pb-8 font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-4 sm:px-10 sm:pb-10 lg:px-20 lg:pb-14">
            <span>Linknbit - Operations Portal</span>
            <span className="hidden sm:block">EN - ISLAMABAD - PKT</span>
          </div>
        </div>
      </div>
    </>
  )
}
