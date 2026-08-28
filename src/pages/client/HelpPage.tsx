import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  ChevronDown,
  MessageSquare,
  BookOpen,
  Video,
  Mail,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const FAQS = [
  {
    q: 'How do I approve a project stage?',
    a: 'Go to the Approvals page from the top navigation. Under "Awaiting Review" you will see all stages and files needing your sign-off. Click "Approve Stage" to confirm, or "Request Revision" to send feedback to the team.',
  },
  {
    q: 'What does "Action Needed" mean on my project?',
    a: '"Action Needed" means the team is waiting for your input before they can proceed, usually a stage approval or file review. Click the project card to see what needs your attention.',
  },
  {
    q: 'How do I download a delivered file?',
    a: 'Visit Files & Deliverables from the navigation. Find the file you want and click the Download button. You can also filter by project or file type to find files quickly.',
  },
  {
    q: 'Can I add more members from my company?',
    a: 'Yes. Reach out to your project manager at Linknbit or use the Contact Support form below to request additional client member seats for your portal.',
  },
  {
    q: 'How often are project reports updated?',
    a: 'Reports are refreshed every time the Linknbit team updates a milestone or stage. The progress chart reflects weekly snapshots, so you can track velocity over time.',
  },
  {
    q: 'What happens after I request a revision?',
    a: 'Your project manager receives an instant notification with your notes. They will schedule the revision work and update the stage once changes are complete and ready for re-review.',
  },
]

function FaqItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: '#EAE3D6' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-client-bg"
      >
        <span className="text-[14px] font-semibold" style={{ color: '#1A1612' }}>
          {faq.q}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown size={16} style={{ color: '#877F71' }} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-body/relaxed" style={{ color: '#4F4940' }}>
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ResourceCard({
  icon: Icon,
  title,
  description,
  linkLabel,
  color,
}: {
  icon: React.ElementType
  title: string
  description: string
  linkLabel: string
  color: string
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white border rounded-2xl p-5 flex flex-col gap-3"
      style={{ borderColor: '#EAE3D6' }}
      whileHover={{ y: -2, boxShadow: '0 6px 18px rgba(26,22,18,0.07)' }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div
        className="size-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}15` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="font-display font-bold text-[15px] mb-1" style={{ color: '#1A1612' }}>
          {title}
        </p>
        <p className="text-body-sm/relaxed" style={{ color: '#877F71' }}>
          {description}
        </p>
      </div>
      <button
        className="flex items-center gap-1.5 text-[13px] font-semibold mt-auto"
        style={{ color }}
      >
        {linkLabel}
        <ExternalLink size={12} />
      </button>
    </motion.div>
  )
}

export default function ClientHelpPage() {
  const [messageSent, setMessageSent] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (subject && message) {
      setMessageSent(true)
      setSubject('')
      setMessage('')
      setTimeout(() => setMessageSent(false), 4000)
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
          Help &amp; Support
        </h1>
        <p className="text-[15px]" style={{ color: '#4F4940' }}>
          Guides, FAQs, and direct support from the Linknbit team.
        </p>
      </motion.div>

      {/* Quick resources */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-5 mb-10">
        <ResourceCard
          icon={BookOpen}
          title="Documentation"
          description="Step-by-step guides for every feature in the client portal."
          linkLabel="Browse docs"
          color="#0E8B9A"
        />
        <ResourceCard
          icon={Video}
          title="Video Tutorials"
          description="Watch walkthroughs for approvals, file downloads, and reports."
          linkLabel="Watch now"
          color="#7A3FD9"
        />
        <ResourceCard
          icon={MessageSquare}
          title="Live Chat"
          description="Chat directly with your project manager during business hours."
          linkLabel="Start chat"
          color="#1F9D55"
        />
      </motion.div>

      <div className="grid grid-cols-2 gap-6">
        {/* FAQs */}
        <motion.div variants={fadeUp}>
          <h2 className="font-display font-bold text-[20px] tracking-tight mb-4" style={{ color: '#1A1612' }}>
            Frequently Asked Questions
          </h2>
          <div
            className="bg-white border rounded-2xl overflow-hidden"
            style={{ borderColor: '#EAE3D6' }}
          >
            {FAQS.map((faq, i) => (
              <FaqItem key={i} faq={faq} />
            ))}
          </div>
        </motion.div>

        {/* Contact form */}
        <motion.div variants={fadeUp}>
          <h2 className="font-display font-bold text-[20px] tracking-tight mb-4" style={{ color: '#1A1612' }}>
            Contact Support
          </h2>
          <div
            className="bg-white border rounded-2xl p-5 space-y-4"
            style={{ borderColor: '#EAE3D6' }}
          >
            <div
              className="flex items-center gap-3 p-3.5 rounded-xl"
              style={{ background: '#FAF7F2', border: '1px solid #EAE3D6' }}
            >
              <Mail size={15} style={{ color: '#877F71' }} />
              <div>
                <p className="text-[13px] font-medium" style={{ color: '#1A1612' }}>
                  support@linknbit.com
                </p>
                <p className="text-[11px] font-mono" style={{ color: '#B7AE9D' }}>
                  Mon–Fri · 9am–6pm PKT · Replies within 4 hours
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#4F4940' }}>
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What do you need help with?"
                className="w-full text-[13px] px-3 py-2.5 rounded-xl border outline-none focus:border-[#E01414]/40 transition-colors"
                style={{ background: '#FAF7F2', borderColor: '#EAE3D6', color: '#1A1612' }}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#4F4940' }}>
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail…"
                rows={4}
                className="w-full text-[13px] px-3 py-2.5 rounded-xl border outline-none resize-none focus:border-[#E01414]/40 transition-colors"
                style={{ background: '#FAF7F2', borderColor: '#EAE3D6', color: '#1A1612' }}
              />
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSend}
                disabled={!subject || !message}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40"
                style={{ background: '#E01414' }}
              >
                Send Message
              </motion.button>
              <AnimatePresence>
                {messageSent && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-[13px] font-semibold"
                    style={{ color: '#1F9D55' }}
                  >
                    <CheckCircle2 size={14} /> Sent!
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
