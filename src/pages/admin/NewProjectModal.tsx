import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Select } from '../../components/ui/Select'
import { USERS } from '../../data/mock'
import type { ServiceType } from '../../types'

interface NewProjectModalProps {
  onClose: () => void
}

const SERVICE_OPTIONS = [
  { value: 'development', label: 'Development', dot: '#22D3EE' },
  { value: 'design', label: 'Design', dot: '#A78BFA' },
  { value: 'marketing', label: 'Marketing', dot: '#FBBF24' },
]

const CLIENT_OPTIONS = [
  { value: 'cricket-sansar', label: 'Cricket Sansar' },
  { value: 'vpnguider', label: 'VPNGuider' },
  { value: 'rahim-gul', label: 'Rahim Gul GLT' },
  { value: 'starr', label: 'Starr Luxury Cars' },
  { value: 'irene-teo', label: 'Irene Teo Coaching' },
  { value: 'offsite-pro', label: 'Offsite Pro' },
  { value: 'medigrow', label: 'MediGrow' },
  { value: 'internal', label: 'Internal (Linknbit)' },
]

const PM_OPTIONS = USERS.filter((u) => ['project_manager', 'team_lead', 'admin'].includes(u.role)).map((u) => ({
  value: u.id,
  label: u.name,
}))

export function NewProjectModal({ onClose }: NewProjectModalProps) {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [service, setService] = useState<ServiceType | ''>('')
  const [pm, setPm] = useState('')
  const [deadline, setDeadline] = useState('')
  const [budget, setBudget] = useState('')
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-1 border border-border-default rounded-xl shadow-pop w-full max-w-[540px] mx-4 z-10">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border-subtle">
          <div>
            <h2 className="font-display font-bold text-[18px] text-text-1 tracking-tight">New Project</h2>
            <p className="text-body-sm text-text-3 mt-0.5">Fill in project details to get started</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto size-8 rounded-sm border border-border-default bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text-1 flex items-center justify-center transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Project Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-ui font-semibold text-text-3 uppercase tracking-wider">
              Project Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cricket Sansar App v2"
              className="h-10 bg-surface-2 border border-border-default rounded-sm px-3 text-[13px] font-ui text-text-1 placeholder:text-text-3 outline-none focus:border-border-focus transition-colors"
            />
          </div>

          {/* Client + Service */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-ui font-semibold text-text-3 uppercase tracking-wider">
                Client <span className="text-error">*</span>
              </label>
              <Select
                value={client}
                onChange={setClient}
                options={CLIENT_OPTIONS}
                placeholder="Select client"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-ui font-semibold text-text-3 uppercase tracking-wider">
                Service Type <span className="text-error">*</span>
              </label>
              <Select
                value={service}
                onChange={(v) => setService(v as ServiceType)}
                options={SERVICE_OPTIONS}
                placeholder="Select service"
                className="w-full"
              />
            </div>
          </div>

          {/* PM + Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-ui font-semibold text-text-3 uppercase tracking-wider">
                Project Manager
              </label>
              <Select
                value={pm}
                onChange={setPm}
                options={PM_OPTIONS}
                placeholder="Assign PM"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-ui font-semibold text-text-3 uppercase tracking-wider">
                Deadline <span className="text-error">*</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-9 bg-surface-2 border border-border-default rounded-sm px-3 text-[12.5px] font-mono text-text-1 outline-none focus:border-border-focus transition-colors scheme-dark"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-ui font-semibold text-text-3 uppercase tracking-wider">
              Budget (PKR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-text-3">PKR</span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
                className="w-full h-9 bg-surface-2 border border-border-default rounded-sm pl-12 pr-3 text-[12.5px] font-mono text-text-1 placeholder:text-text-3 outline-none focus:border-border-focus transition-colors"
              />
            </div>
          </div>

          {/* Internal Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-ui font-semibold text-text-3 uppercase tracking-wider">
              Internal Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any internal notes or context for the team..."
              rows={3}
              className="bg-surface-2 border border-border-default rounded-sm px-3 py-2.5 text-body-sm/relaxed font-ui text-text-1 placeholder:text-text-3 outline-none focus:border-border-focus transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle flex items-center gap-3 justify-between">
          <p className="text-[11px] text-text-4 font-mono">
            <span className="text-error">*</span> Required fields
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-sm border border-border-default bg-surface-1 text-text-1 font-ui font-semibold text-[13px] hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              className={cn(
                'h-9 px-4 rounded-sm bg-brand-red text-white font-ui font-semibold text-[13px] flex items-center gap-2 transition-colors shadow-[0_4px_12px_rgba(238,39,55,0.2)]',
                (!name || !client || !service || !deadline) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-brand-red-hover',
              )}
              disabled={!name || !client || !service || !deadline}
            >
              <Plus size={14} /> Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
