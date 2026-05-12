import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Check, ArrowRight, ChevronLeft, Info, RotateCcw, LayoutGrid } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────
type AuthView = 'login' | 'forgot' | 'forgot-sent' | 'splash'
type BootStep = 'done' | 'now' | 'pending'

interface SplashUser {
  initials: string
  name: string
  role: string
  pod: string
  path: string
}

// ─── Data ────────────────────────────────────────────────────
const DEMO_ACCOUNTS: Array<SplashUser & { email: string; label: string; labelColor: string }> = [
  { email: 'ghayas@linknbit.com',       label: 'Admin',    labelColor: '#EE2737', initials: 'GK', name: 'Ghayas Karimi', role: 'Operations Admin', pod: 'Admin pod',      path: '/admin/dashboard' },
  { email: 'usman@linknbit.com',         label: 'Employee', labelColor: '#22D3EE', initials: 'UT', name: 'Usman Tariq',   role: 'Lead Developer',   pod: 'Dev pod',        path: '/employee/dashboard' },
  { email: 'imran@cricketsansar.com',    label: 'Client',   labelColor: '#FBBF24', initials: 'IK', name: 'Imran Khan',    role: 'Client',           pod: 'Cricket Sansar', path: '/client/projects' },
]

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!domain) return email
  return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 4))}@${domain}`
}

// ─── Brand Panel ─────────────────────────────────────────────
function BrandPanel() {
  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0D131D 0%, #0A0F17 100%)',
        padding: '56px 64px',
        minHeight: '100vh',
      }}
    >
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(122,133,151,0.10) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          backgroundPosition: '-1px -1px',
          opacity: 0.6,
          maskImage: 'radial-gradient(ellipse 80% 65% at 50% 50%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 65% at 50% 50%, #000 40%, transparent 100%)',
        }}
      />
      {/* Hairline inner frame */}
      <div
        className="absolute pointer-events-none"
        style={{ inset: 24, border: '1px solid rgba(255,255,255,0.04)', borderRadius: 6 }}
      />

      {/* ── TOP: Logo + stamp ── */}
      <div className="relative z-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center text-white shrink-0"
            style={{ width: 30, height: 30, borderRadius: 6, background: '#EE2737', fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16 }}
          >
            L
          </span>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', color: '#F2F5F9' }}>
            Linknbit
          </span>
        </div>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10.5, color: '#4A5468', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Portal <b style={{ color: '#B5C0CF', fontWeight: 500 }}>v2.0</b> · MAY 2026
        </span>
      </div>

      {/* ── MIDDLE: Glyph + headline (grows to fill space) ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center" style={{ margin: '0 0 24px' }}>
        {/* Glyph artwork */}
        <div
          aria-hidden="true"
          className="relative w-full max-w-120"
          style={{ height: 320, marginBottom: 32, flexShrink: 0 }}
        >
          {/* Crosshairs at glyph corners */}
          <span className="auth-cross" style={{ position: 'absolute', top: 4, left: 0 }} />
          <span className="auth-cross" style={{ position: 'absolute', bottom: 4, right: 0 }} />

          {/* Service orbs — overlapping blobs */}
          <div
            className="grid w-full h-full pl-7.5"
            style={{ gridTemplateRows: 'repeat(37, 1fr)', gridTemplateColumns: 'repeat(40, 1fr)' }}
          >
            <div
              className="[grid-area:1/1/24/24] rounded-full aspect-square"
              style={{ background: 'radial-gradient(circle at 35% 35%, #C4B5FD 0%, #8B5CF6 45%, transparent 75%)', filter: 'blur(2px)', mixBlendMode: 'screen', opacity: 0.78 }}
            />
            <div className="rounded-full aspect-square [grid-area:1/1/24/24] z-1 border border-[rgba(139,92,246,0.53)]">
              <span className="flex items-center" style={{ gap: 8, fontFamily: 'JetBrains Mono', fontSize: 10, color: '#C4B5FD', letterSpacing: '0.16em', textTransform: 'uppercase', left: 0, top: 8 }}>
                <span className="rounded-full shrink-0 w-1.5 h-1.5" style={{ background: '#A78BFA' }} />
                Design
              </span>
            </div>

            <div
              className="[grid-area:4/16/28/40] rounded-full aspect-square"
              style={{ background: 'radial-gradient(circle at 65% 40%, #67E8F9 0%, #06B6D4 45%, transparent 75%)', filter: 'blur(2px)', mixBlendMode: 'screen', opacity: 0.78 }}
            />
            <div className="rounded-full aspect-square [grid-area:4/16/28/40] z-1 border border-[rgba(6,182,212,0.53)]">
              <span className="flex items-center justify-end translate-y-5 translate-x-15" style={{ gap: 8, fontFamily: 'JetBrains Mono', fontSize: 10, color: '#67E8F9', letterSpacing: '0.16em', textTransform: 'uppercase', right: 0, top: 52 }}>
                <span className="rounded-full shrink-0 w-1.5 h-1.5" style={{ background: '#22D3EE' }} />
                Development
              </span>
            </div>

            <div
              className="[grid-area:13/7/37/31] rounded-full aspect-square"
              style={{ background: 'radial-gradient(circle at 50% 60%, #FCD34D 0%, #F59E0B 45%, transparent 75%)', filter: 'blur(2px)', mixBlendMode: 'screen', opacity: 0.78 }}
            />
            <div className="flex rounded-full aspect-square [grid-area:13/7/37/31] z-1 border border-[rgba(245,158,11,0.53)]">
              <span className="flex items-center mt-auto ml-auto translate-x-15 -translate-y-5" style={{ gap: 8, fontFamily: 'JetBrains Mono', fontSize: 10, color: '#FCD34D', letterSpacing: '0.16em', textTransform: 'uppercase', left: 70, bottom: 0 }}>
                <span className="rounded-full shrink-0 w-1.5 h-1.5" style={{ background: '#FBBF24' }} />
                Marketing
              </span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <h2
          className="text-text-1"
          style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 'clamp(40px, 4.5vw, 64px)', lineHeight: 0.92, letterSpacing: '-0.025em', margin: 0 }}
        >
          Unified<br />operations<span style={{ color: '#EE2737' }}>.</span>
        </h2>
        <p
          className="text-text-2"
          style={{ marginTop: 20, fontFamily: 'IBM Plex Sans', fontSize: 14.5, lineHeight: 1.6, maxWidth: 400 }}
        >
          One workspace for the three sides of Linknbit — design, engineering, and growth. Sign in to pick up where your team left off.
        </p>
      </div>

      {/* ── BOTTOM: Legend ── */}
      <div
        className="relative z-10 flex items-center justify-between shrink-0"
        style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#4A5468', letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        <div className="flex" style={{ gap: 18 }}>
          {[{ label: 'Design', color: '#A78BFA' }, { label: 'Development', color: '#22D3EE' }, { label: 'Marketing', color: '#FBBF24' }].map((s) => (
            <span key={s.label} className="flex items-center" style={{ gap: 7 }}>
              <span className="shrink-0 w-1.5 h-1.5 rounded-[2px]" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <span>© 2026 Linknbit · Karachi <b style={{ color: '#B5C0CF', fontWeight: 500 }}>·</b> PKT 14:32</span>
      </div>
    </div>
  )
}

// ─── Auth Input ───────────────────────────────────────────────
function AuthInput({
  label, type = 'text', value, onChange, placeholder, invalid = false,
  icon, labelRight, rightSlot,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void
  placeholder?: string; invalid?: boolean; icon?: ReactNode; labelRight?: ReactNode; rightSlot?: ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
      <div style={{ fontFamily: 'IBM Plex Sans', fontWeight: 600, fontSize: 11, color: '#B5C0CF', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>{label}</span>
        {labelRight}
      </div>
      <div style={{ background: '#0B121C', border: `1px solid ${invalid ? '#F4364C' : focused ? '#EE2737' : '#2A3647'}`, borderRadius: 6, padding: '0 14px', height: 46, display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color 120ms, box-shadow 120ms', boxShadow: focused && !invalid ? '0 0 0 3px rgba(238,39,55,0.35)' : 'none' }}>
        {icon && <span style={{ color: '#7A8597', flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>}
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ background: 'transparent', border: 0, outline: 'none', flex: 1, color: '#F2F5F9', fontFamily: 'IBM Plex Sans', fontSize: 14, minWidth: 0, height: '100%' }}
        />
        {rightSlot}
      </div>
    </div>
  )
}

// ─── Auth Button ──────────────────────────────────────────────
function AuthBtn({ children, onClick, variant = 'primary', disabled = false, type = 'button' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'discord' | 'ghost'
  disabled?: boolean; type?: 'button' | 'submit'
}) {
  const styles = {
    primary: { background: '#EE2737', boxShadow: '0 4px 14px rgba(238,39,55,0.22)', border: '1px solid transparent' },
    discord: { background: '#5865F2', boxShadow: '0 4px 14px rgba(88,101,242,0.22)', border: '1px solid transparent' },
    ghost:   { background: '#131C28', boxShadow: 'none', border: '1px solid #2A3647' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ width: '100%', height: 46, borderRadius: 6, fontFamily: 'IBM Plex Sans', fontWeight: 600, fontSize: 14, color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background 120ms', opacity: disabled ? 0.5 : 1, ...styles[variant] }}>
      {children}
    </button>
  )
}

// ─── Login Form ───────────────────────────────────────────────
function LoginForm({ onSuccess, onForgot }: { onSuccess: (u: SplashUser) => void; onForgot: () => void }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState(false)
  const [attempts, setAttempts] = useState(0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const matched = DEMO_ACCOUNTS.find((a) => a.email === email.trim())
    if (matched && password) { onSuccess(matched) } else { setError(true); setAttempts((n) => n + 1) }
  }

  const emailIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
  const lockIcon  = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>

  return (
    <form onSubmit={handleSubmit}>
      <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 32, lineHeight: 1.15, letterSpacing: '-0.018em', color: '#F2F5F9', margin: '0 0 8px' }}>Welcome back.</h1>
      <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 14, lineHeight: 1.55, color: '#7A8597', margin: '0 0 28px' }}>Sign in to your workspace to continue.</p>

      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 14px', marginBottom: 18, background: 'rgba(244,54,76,0.13)', border: '1px solid rgba(244,54,76,0.33)', borderRadius: 6, alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ color: '#F4364C', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 12.5, lineHeight: 1.5, color: '#F2F5F9' }}>
            <strong style={{ color: '#F4364C', fontWeight: 600 }}>That email and password don't match.</strong>{' '}
            Double-check your credentials or reset your password.
            <span style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: 10.5, color: '#7A8597', marginTop: 4, letterSpacing: '0.04em' }}>Attempt {attempts} of 5 · next try free</span>
          </div>
        </div>
      )}

      <AuthInput label="Work email" type="email" value={email} onChange={setEmail} invalid={error} icon={emailIcon} />
      <AuthInput
        label="Password" type={showPass ? 'text' : 'password'} value={password} onChange={setPassword}
        invalid={error} icon={lockIcon}
        labelRight={<button type="button" onClick={onForgot} style={{ fontFamily: 'IBM Plex Sans', fontWeight: 500, fontSize: 11.5, color: '#EE2737', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}>Forgot password?</button>}
        rightSlot={<button type="button" onClick={() => setShowPass((v) => !v)} style={{ background: 'transparent', border: 0, color: '#7A8597', fontFamily: 'IBM Plex Sans', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, flexShrink: 0 }}>{showPass ? 'Hide' : 'Show'}</button>}
      />

      <div style={{ marginTop: 8 }}>
        <AuthBtn type="submit" variant="primary">Sign in <ArrowRight size={16} /></AuthBtn>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0', fontFamily: 'JetBrains Mono', fontSize: 10.5, color: '#4A5468', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
        <span style={{ flex: 1, height: 1, background: '#1E2937' }} />
        or continue with
        <span style={{ flex: 1, height: 1, background: '#1E2937' }} />
      </div>

      <AuthBtn variant="discord">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.078.078 0 0 0-.083.038c-.18.32-.378.736-.515 1.062a18.27 18.27 0 0 0-5.488 0 12.51 12.51 0 0 0-.523-1.062.08.08 0 0 0-.083-.038c-1.305.225-2.55.62-3.76 1.169a.07.07 0 0 0-.032.027C2.65 8.045 1.997 11.617 2.317 15.145a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 6.002 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.077.077 0 0 0-.041-.106 13.11 13.11 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.292a.075.075 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.06 0a.075.075 0 0 1 .079.009c.12.1.245.199.371.293a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.077.077 0 0 0 .084.028 19.83 19.83 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-4.077-.838-7.62-3.548-10.749a.061.061 0 0 0-.031-.027ZM8.02 13.5c-1.182 0-2.157-1.085-2.157-2.42 0-1.333.957-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.419 0 1.334-.957 2.419-2.157 2.419Zm7.974 0c-1.182 0-2.157-1.085-2.157-2.42 0-1.333.957-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.419 0 1.334-.946 2.419-2.157 2.419Z"/></svg>
        Continue with Discord
      </AuthBtn>

      <div style={{ marginTop: 24, padding: '12px 14px', borderRadius: 6, background: '#131C28', border: '1px solid #1E2937', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#7A8597', lineHeight: 1.5 }}>
        <Info size={14} style={{ color: '#7A8597', flexShrink: 0 }} />
        <span><strong style={{ color: '#B5C0CF', fontWeight: 600 }}>Access is invite-only.</strong> Contact your admin if you need an account.</span>
      </div>

      {/* Prototype demo switcher */}
      <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #1A2433' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9.5, color: '#4A5468', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>Prototype · demo accounts</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <button key={acc.email} type="button" onClick={() => onSuccess(acc)} style={{ padding: '8px 10px', background: '#0F1620', border: '1px solid #2A3647', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}>
              <p style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, color: acc.labelColor, marginBottom: 2 }}>{acc.label}</p>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#4A5468' }}>{acc.email.split('@')[0]}</p>
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}

// ─── Forgot Form ──────────────────────────────────────────────
function ForgotForm({ onBack, onSent }: { onBack: () => void; onSent: (email: string) => void }) {
  const [email, setEmail] = useState('')
  return (
    <div>
      <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 32, lineHeight: 1.15, letterSpacing: '-0.018em', color: '#F2F5F9', margin: '0 0 8px' }}>Reset your password.</h1>
      <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 14, lineHeight: 1.55, color: '#7A8597', margin: '0 0 28px' }}>Enter your work email and we'll send you a secure link to reset it.</p>
      <AuthInput label="Work email" type="email" value={email} onChange={setEmail}
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>}
      />
      <div style={{ marginTop: 8 }}>
        <AuthBtn onClick={() => onSent(email || 'user@linknbit.com')} variant="primary">Send reset link <ArrowRight size={16} /></AuthBtn>
      </div>
      <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'IBM Plex Sans', fontSize: 13, color: '#B5C0CF', background: 'none', border: 'none', cursor: 'pointer', marginTop: 22, padding: '6px 10px 6px 6px', borderRadius: 6 }}>
        <ChevronLeft size={14} /> Back to sign in
      </button>
      <div style={{ marginTop: 28, padding: '12px 14px', borderRadius: 6, background: '#131C28', border: '1px solid #1E2937', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#7A8597', lineHeight: 1.5 }}>
        <Info size={14} style={{ color: '#7A8597', flexShrink: 0 }} />
        <span>Reset links expire after <strong style={{ color: '#B5C0CF', fontWeight: 600 }}>15 minutes</strong> for security.</span>
      </div>
    </div>
  )
}

// ─── Forgot Sent ──────────────────────────────────────────────
function ForgotSent({ email, onBack }: { email: string; onBack: () => void }) {
  const [seconds, setSeconds] = useState(54)
  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])
  return (
    <div style={{ textAlign: 'center', paddingTop: 18 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(160deg, #1A2433 0%, #131C28 100%)', border: '1px solid #2A3647', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, color: '#EE2737', boxShadow: '0 0 0 6px rgba(238,39,55,0.06)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 4 12 14.01l-3-3"/><path d="M22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/>
        </svg>
      </div>
      <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 32, lineHeight: 1.15, letterSpacing: '-0.018em', color: '#F2F5F9', margin: '0 0 8px' }}>Check your inbox.</h1>
      <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 14, lineHeight: 1.55, color: '#7A8597', margin: 0 }}>If an account exists with this email, you'll receive a reset link within a minute.</p>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#131C28', border: '1px solid #2A3647', borderRadius: 999, fontFamily: 'JetBrains Mono', fontSize: 13, color: '#F2F5F9', marginTop: 16 }}>
        <span style={{ width: 5, height: 5, borderRadius: 999, background: '#22C55E', flexShrink: 0 }} />
        {maskEmail(email)}
      </div>
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AuthBtn variant="ghost" disabled={seconds > 0}>
          <RotateCcw size={14} />
          Resend link
          {seconds > 0 && <span style={{ color: '#7A8597', fontWeight: 400, marginLeft: 6 }}>· in 0:{String(seconds).padStart(2, '0')}</span>}
        </AuthBtn>
        <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'IBM Plex Sans', fontSize: 13, color: '#B5C0CF', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: '6px 10px', borderRadius: 6 }}>
          <ChevronLeft size={14} /> Back to sign in
        </button>
      </div>
      <div style={{ marginTop: 28, padding: '12px 14px', borderRadius: 6, background: '#131C28', border: '1px solid #1E2937', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#7A8597', lineHeight: 1.5, textAlign: 'left' }}>
        <Info size={14} style={{ color: '#7A8597', flexShrink: 0 }} />
        <span>Didn't get it? Check spam, or contact <strong style={{ color: '#B5C0CF', fontWeight: 600 }}>help@linknbit.com</strong>.</span>
      </div>
    </div>
  )
}

// ─── Boot checklist item ──────────────────────────────────────
function BootItem({ status, label, ms }: { status: BootStep; label: string; ms: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', fontFamily: 'JetBrains Mono', fontSize: 12, color: status === 'pending' ? '#4A5468' : '#B5C0CF', letterSpacing: '0.02em' }}>
      <span style={{ width: 16, height: 16, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: status === 'done' ? 'rgba(34,197,94,0.13)' : status === 'now' ? 'rgba(238,39,55,0.15)' : 'transparent', border: status === 'pending' ? '1px solid #2A3647' : 'none', color: status === 'done' ? '#22C55E' : '#EE2737' }}>
        {status === 'done' && <Check size={10} strokeWidth={3} />}
        {status === 'now'  && <span className="auth-checklist-spin" />}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ color: '#4A5468', fontSize: 11 }}>{ms}</span>
    </div>
  )
}

// ─── Splash Screen ────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 50%, #0F1620 0%, #06080C 70%)', padding: '56px 64px' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(122,133,151,0.07) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 100%)' }} />
      <div className="absolute flex items-center justify-between" style={{ top: 32, left: 32, right: 32, fontFamily: 'JetBrains Mono', fontSize: 10.5, color: '#4A5468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center text-white shrink-0" style={{ width: 30, height: 30, borderRadius: 6, background: '#EE2737', fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16 }}>L</span>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', color: '#F2F5F9' }}>Linknbit</span>
        </div>
        <div className="flex items-center" style={{ gap: 14 }}>
          <span>Session <b style={{ color: '#B5C0CF', fontWeight: 500 }}>8a3f-2c91</b></span>
          <span className="flex items-center" style={{ gap: 6, color: '#22C55E' }}><span className="auth-live-dot" />Authenticated</span>
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-center" style={{ gap: 28, textAlign: 'center' }}>
        <div className="relative flex items-center justify-center" style={{ width: 132, height: 132 }}>
          <div className="splash-orbit splash-orbit-mkt" />
          <div className="splash-orbit splash-orbit-design" />
          <div className="splash-orbit splash-orbit-dev" />
          <div className="flex items-center justify-center" style={{ width: 88, height: 88, borderRadius: 999, background: 'linear-gradient(135deg, #A78BFA, #8B5CF6)', color: '#fff', fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 32, border: '2px solid #1A2433', boxShadow: '0 0 60px rgba(167,139,250,0.25)', position: 'relative', zIndex: 3 }}>
            {user.initials}
          </div>
        </div>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 36, lineHeight: 1.15, letterSpacing: '-0.02em', color: '#F2F5F9', margin: 0 }}>
            <span style={{ color: '#7A8597', fontWeight: 500 }}>Welcome,</span> <span>{user.name}</span><span style={{ color: '#EE2737' }}>.</span>
          </h1>
          <div style={{ marginTop: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 5px', borderRadius: 999, background: '#1A2433', border: '1px solid #2A3647', fontFamily: 'IBM Plex Sans', fontWeight: 600, fontSize: 12.5, color: '#F2F5F9' }}>
              <span style={{ width: 24, height: 24, borderRadius: 999, background: 'linear-gradient(135deg, #A78BFA, #8B5CF6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><LayoutGrid size={13} /></span>
              {user.role} · {user.pod}
            </span>
          </div>
        </div>
        <div style={{ width: 480, maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: 4, padding: '18px 22px', background: 'rgba(19,28,40,0.5)', border: '1px solid #1E2937', borderRadius: 10, backdropFilter: 'blur(6px)', textAlign: 'left' }}>
          <BootItem status="done"  label="Verifying credentials"               ms="142ms" />
          <BootItem status="done"  label="Loading role permissions"             ms="87ms" />
          <BootItem status={step3} label="Syncing your projects from ClickUp"   ms={step3 === 'now' ? '…' : '203ms'} />
          <BootItem status={step4} label="Preparing your dashboard"             ms={step4 === 'pending' ? 'queued' : step4 === 'now' ? '…' : 'ready'} />
        </div>
        <div style={{ width: 480, maxWidth: '90vw', height: 4, background: '#0B121C', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
          <div className="splash-progress-fill" />
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#7A8597', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Setting up your workspace</span>
          <span style={{ display: 'inline-flex', gap: 4 }}>
            <span className="auth-typing-dot" /><span className="auth-typing-dot" /><span className="auth-typing-dot" /><span className="auth-typing-dot" />
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate()
  const [view, setView]             = useState<AuthView>('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [splashUser, setSplashUser] = useState<SplashUser | null>(null)

  function triggerSplash(user: SplashUser) { setSplashUser(user); setView('splash') }

  return (
    <>
      {view === 'splash' && splashUser && (
        <SplashScreen user={splashUser} onDone={() => navigate(splashUser.path)} />
      )}

      {/* Full-viewport layout: flex row on lg+, single column on mobile */}
      <div className="min-h-screen flex" style={{ background: '#0B1018' }}>

        {/* ── Left: Brand panel — hidden on mobile, shown lg+ ── */}
        <div className="hidden lg:block lg:w-1/2 shrink-0">
          <BrandPanel />
        </div>

        {/* ── Right: Form panel — full width on mobile, half on lg ── */}
        <div className="flex flex-col flex-1 min-h-screen" style={{ background: '#0B1018' }}>

          {/* Top bar */}
          <div className="flex items-center justify-between shrink-0 px-6 pt-8 sm:px-10 sm:pt-10 lg:px-20 lg:pt-14">
            <div className="flex items-center gap-2.5">
              <span style={{ width: 24, height: 24, borderRadius: 5, background: '#EE2737', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>L</span>
              <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 14, color: '#B5C0CF', letterSpacing: '-0.005em' }}>Operations Portal</span>
            </div>
            <span className="hidden sm:block" style={{ fontFamily: 'JetBrains Mono', fontSize: 10.5, color: '#4A5468', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Need help? help@linknbit.com
            </span>
          </div>

          {/* Mobile-only: mini brand strip */}
          <div className="lg:hidden px-6 pt-8 pb-4 sm:px-10">
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0D131D 0%, #0A0F17 100%)', borderRadius: 10, border: '1px solid #1E2937', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                <span className="absolute rounded-full" style={{ width: 36, height: 36, left: 0, top: 0, background: 'radial-gradient(circle at 35% 35%, #C4B5FD 0%, #8B5CF6 45%, transparent 75%)', filter: 'blur(1px)', mixBlendMode: 'screen', opacity: 0.8 }} />
                <span className="absolute rounded-full" style={{ width: 36, height: 36, left: 12, top: 10, background: 'radial-gradient(circle at 65% 40%, #67E8F9 0%, #06B6D4 45%, transparent 75%)', filter: 'blur(1px)', mixBlendMode: 'screen', opacity: 0.8 }} />
                <span className="absolute rounded-full" style={{ width: 36, height: 36, left: 6, top: 18, background: 'radial-gradient(circle at 50% 60%, #FCD34D 0%, #F59E0B 45%, transparent 75%)', filter: 'blur(1px)', mixBlendMode: 'screen', opacity: 0.8 }} />
              </div>
              <div>
                <p style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16, color: '#F2F5F9', margin: 0, letterSpacing: '-0.015em' }}>Unified operations<span style={{ color: '#EE2737' }}>.</span></p>
                <p style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#7A8597', margin: 0, marginTop: 2 }}>Design · Development · Marketing</p>
              </div>
            </div>
          </div>

          {/* Form card — vertically centered in flex-1 */}
          <div className="flex-1 flex items-center justify-center px-6 py-8 sm:px-10 lg:px-20">
            <div style={{ width: '100%', maxWidth: 400 }}>
              {view === 'login' && (
                <LoginForm onSuccess={triggerSplash} onForgot={() => setView('forgot')} />
              )}
              {view === 'forgot' && (
                <ForgotForm onBack={() => setView('login')} onSent={(e) => { setForgotEmail(e); setView('forgot-sent') }} />
              )}
              {view === 'forgot-sent' && (
                <ForgotSent email={forgotEmail} onBack={() => setView('login')} />
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="shrink-0 flex items-center justify-between px-6 pb-8 sm:px-10 sm:pb-10 lg:px-20 lg:pb-14" style={{ fontFamily: 'JetBrains Mono', fontSize: 10.5, color: '#4A5468', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span>Linknbit · Operations Portal</span>
            <span className="hidden sm:block">EN · KARACHI · PKT</span>
          </div>
        </div>

      </div>
    </>
  )
}
