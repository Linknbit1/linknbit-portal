import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { User, Mail, Building2, Phone, Globe, Camera, CheckCircle2 } from 'lucide-react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  )
}

function Field({
  label,
  value,
  icon: Icon,
  editable = true,
}: {
  label: string
  value: string
  icon?: React.ElementType
  editable?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex items-start gap-4 py-4 border-b last:border-b-0" style={{ borderColor: '#F2EDE4' }}>
      {Icon && (
        <div
          className="size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: '#FAF7F2' }}
        >
          <Icon size={14} style={{ color: '#877F71' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-mono uppercase tracking-wider mb-1" style={{ color: '#B7AE9D' }}>
          {label}
        </p>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="flex-1 text-[14px] px-3 py-1.5 rounded-lg border outline-none focus:border-[#EE2737]/40 transition-colors"
              style={{ background: '#FAF7F2', borderColor: '#EAE3D6', color: '#1A1612' }}
              autoFocus
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white"
              style={{ background: '#EE2737' }}
            >
              Save
            </motion.button>
            <button
              onClick={() => { setEditing(false); setVal(value) }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{ border: '1px solid #EAE3D6', color: '#4F4940' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-medium" style={{ color: '#1A1612' }}>
              {val}
            </p>
            <div className="flex items-center gap-2">
              {saved && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: '#1F9D55' }}
                >
                  <CheckCircle2 size={12} /> Saved
                </motion.span>
              )}
              {editable && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-[12px] font-semibold transition-colors hover:opacity-70"
                  style={{ color: '#EE2737' }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClientAccountPage() {
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
          My Account
        </h1>
        <p className="text-[15px]" style={{ color: '#4F4940' }}>
          Manage your profile and account information.
        </p>
      </motion.div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: avatar + role */}
        <motion.div variants={fadeUp} className="col-span-1">
          <div
            className="bg-white border rounded-2xl p-6 flex flex-col items-center text-center"
            style={{ borderColor: '#EAE3D6' }}
          >
            <div className="relative mb-4">
              <div
                className="size-20 rounded-full flex items-center justify-center font-bold text-[26px]"
                style={{ background: 'linear-gradient(135deg, #FBBF24, #D97706)', color: '#78350F' }}
              >
                IS
              </div>
              <button
                className="absolute bottom-0 right-0 size-7 rounded-full flex items-center justify-center border-2 border-white"
                style={{ background: '#EE2737' }}
              >
                <Camera size={12} color="white" />
              </button>
            </div>
            <p className="font-display font-bold text-[18px] mb-0.5" style={{ color: '#1A1612' }}>
              Imran Shah
            </p>
            <span
              className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full font-bold"
              style={{ background: 'rgba(251,191,36,0.1)', color: '#B47700' }}
            >
              Client Owner
            </span>
            <div className="mt-4 pt-4 border-t w-full text-left space-y-1.5" style={{ borderColor: '#EAE3D6' }}>
              <p className="text-[12px]" style={{ color: '#877F71' }}>
                <span className="font-semibold" style={{ color: '#4F4940' }}>Company</span>
              </p>
              <p className="text-[14px] font-medium" style={{ color: '#1A1612' }}>Cricket Sansar</p>
              <p className="text-[11px] font-mono mt-2" style={{ color: '#B7AE9D' }}>
                Member since April 2026
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right: profile fields */}
        <div className="col-span-2 space-y-5">
          <Section title="Personal Information">
            <Field label="Full Name" value="Imran Shah" icon={User} />
            <Field label="Email Address" value="imran@cricketsansar.com" icon={Mail} editable={false} />
            <Field label="Phone Number" value="+92 300 1234567" icon={Phone} />
            <Field label="Company" value="Cricket Sansar" icon={Building2} />
            <Field label="Website" value="cricketsansar.com" icon={Globe} />
          </Section>

          <Section title="Portal Access">
            <div className="space-y-3">
              {[
                { label: 'Role', value: 'Client Owner', note: 'Full access to all portal features' },
                { label: 'Projects', value: '2 active, 4 total', note: 'Across Design and Development' },
                { label: 'Last Login', value: 'Today at 10:42 AM', note: '' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                  style={{ borderColor: '#F2EDE4' }}
                >
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-wider mb-0.5" style={{ color: '#B7AE9D' }}>
                      {item.label}
                    </p>
                    <p className="text-[14px] font-medium" style={{ color: '#1A1612' }}>{item.value}</p>
                    {item.note && (
                      <p className="text-[12px] mt-0.5" style={{ color: '#877F71' }}>{item.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </motion.div>
  )
}
