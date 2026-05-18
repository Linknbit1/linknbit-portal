import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Bell, Lock, Monitor, CheckCircle2, Shield } from 'lucide-react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <motion.button
      onClick={() => onChange(!checked)}
      className="relative w-10 h-5.5 rounded-full shrink-0 transition-colors"
      style={{
        background: checked ? '#EE2737' : '#D6CFC5',
        height: '22px',
        width: '40px',
      }}
      aria-checked={checked}
      role="switch"
    >
      <motion.span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    </motion.button>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white border rounded-2xl overflow-hidden"
      style={{ borderColor: '#EAE3D6' }}
    >
      <div className="px-6 py-4 border-b" style={{ borderColor: '#EAE3D6' }}>
        <h2 className="font-display font-bold text-[16px]" style={{ color: '#1A1612' }}>
          {title}
        </h2>
        {description && (
          <p className="text-[13px] mt-0.5" style={{ color: '#877F71' }}>
            {description}
          </p>
        )}
      </div>
      <div className="divide-y" style={{ borderColor: '#F2EDE4' }}>
        {children}
      </div>
    </motion.div>
  )
}

function ToggleRow({
  label,
  description,
  defaultOn = true,
}: {
  label: string
  description?: string
  defaultOn?: boolean
}) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-[14px] font-medium" style={{ color: '#1A1612' }}>
          {label}
        </p>
        {description && (
          <p className="text-[12px] mt-0.5" style={{ color: '#877F71' }}>
            {description}
          </p>
        )}
      </div>
      <Toggle checked={on} onChange={setOn} />
    </div>
  )
}

function SelectRow({
  label,
  description,
  options,
  defaultValue,
}: {
  label: string
  description?: string
  options: string[]
  defaultValue: string
}) {
  const [val, setVal] = useState(defaultValue)
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-[14px] font-medium" style={{ color: '#1A1612' }}>
          {label}
        </p>
        {description && (
          <p className="text-[12px] mt-0.5" style={{ color: '#877F71' }}>
            {description}
          </p>
        )}
      </div>
      <select
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="text-[13px] px-3 py-1.5 rounded-lg border outline-none cursor-pointer"
        style={{ background: '#FAF7F2', borderColor: '#EAE3D6', color: '#1A1612' }}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

export default function ClientSettingsPage() {
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const handlePasswordSave = () => {
    if (newPw && newPw === confirmPw) {
      setPasswordSaved(true)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => setPasswordSaved(false), 3000)
    }
  }

  return (
    <motion.div
      className="py-10 font-ui"
      style={{ color: '#1A1612' }}
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="font-display font-bold text-[38px] leading-tight tracking-tight mb-1.5" style={{ color: '#1A1612' }}>
          Settings
        </h1>
        <p className="text-[15px]" style={{ color: '#4F4940' }}>
          Manage your portal preferences and security.
        </p>
      </motion.div>

      <div className="space-y-5 max-w-2xl">
        {/* Notifications */}
        <Section
          title="Notifications"
          description="Choose how and when you receive updates."
        >
          <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: '#F2EDE4' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(238,39,55,0.08)' }}>
              <Bell size={13} style={{ color: '#EE2737' }} />
            </div>
            <span className="text-[12px] font-mono uppercase tracking-wider" style={{ color: '#B7AE9D' }}>
              Email Notifications
            </span>
          </div>
          <ToggleRow label="Stage approvals" description="When a stage is ready for your review" defaultOn={true} />
          <ToggleRow label="File uploads" description="When new files are delivered to you" defaultOn={true} />
          <ToggleRow label="Project status updates" description="When your project moves to a new stage" defaultOn={false} />
          <ToggleRow label="Weekly summary" description="A weekly digest of all project activity" defaultOn={true} />
        </Section>

        {/* Portal preferences */}
        <Section title="Preferences" description="Customise your portal experience.">
          <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: '#F2EDE4' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(14,139,154,0.08)' }}>
              <Monitor size={13} style={{ color: '#0E8B9A' }} />
            </div>
            <span className="text-[12px] font-mono uppercase tracking-wider" style={{ color: '#B7AE9D' }}>
              Display
            </span>
          </div>
          <SelectRow label="Language" options={['English', 'Urdu', 'Arabic']} defaultValue="English" />
          <SelectRow label="Timezone" options={['Asia/Karachi (PKT)', 'UTC', 'Europe/London', 'America/New_York']} defaultValue="Asia/Karachi (PKT)" />
          <SelectRow label="Date format" options={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} defaultValue="DD/MM/YYYY" />
        </Section>

        {/* Security */}
        <Section title="Security" description="Keep your account safe.">
          <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: '#F2EDE4' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(238,39,55,0.08)' }}>
              <Lock size={13} style={{ color: '#EE2737' }} />
            </div>
            <span className="text-[12px] font-mono uppercase tracking-wider" style={{ color: '#B7AE9D' }}>
              Password
            </span>
          </div>
          <div className="px-6 py-4 space-y-3">
            {[
              { label: 'Current password', value: currentPw, set: setCurrentPw, type: 'password' },
              { label: 'New password', value: newPw, set: setNewPw, type: 'password' },
              { label: 'Confirm new password', value: confirmPw, set: setConfirmPw, type: 'password' },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#4F4940' }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  className="w-full text-[13px] px-3 py-2 rounded-xl border outline-none focus:border-[#EE2737]/40 transition-colors"
                  style={{ background: '#FAF7F2', borderColor: '#EAE3D6', color: '#1A1612' }}
                />
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handlePasswordSave}
                disabled={!newPw || newPw !== confirmPw}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40 transition-opacity"
                style={{ background: '#EE2737' }}
              >
                Update Password
              </motion.button>
              {passwordSaved && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 text-[13px] font-semibold"
                  style={{ color: '#1F9D55' }}
                >
                  <CheckCircle2 size={14} /> Password updated
                </motion.span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 border-t" style={{ borderColor: '#F2EDE4' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(31,157,85,0.08)' }}>
              <Shield size={13} style={{ color: '#1F9D55' }} />
            </div>
            <span className="text-[12px] font-mono uppercase tracking-wider" style={{ color: '#B7AE9D' }}>
              Two-Factor Authentication
            </span>
          </div>
          <ToggleRow label="Enable 2FA" description="Add an extra layer of security to your account" defaultOn={false} />
        </Section>
      </div>
    </motion.div>
  )
}
