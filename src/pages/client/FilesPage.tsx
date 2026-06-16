import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Search, Eye, FileText, Folder, Image, Archive, Layers } from 'lucide-react'
import { PROJECTS } from '../../data/mock'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/cn'

interface ClientFile {
  id: string
  name: string
  type: 'figma' | 'pdf' | 'image' | 'doc' | 'spreadsheet' | 'archive'
  size: string
  by: string
  date: string
  projectId: string
  projectName: string
  category: 'design' | 'document' | 'deliverable' | 'reference'
}

const ALL_FILES: ClientFile[] = [
  // Cricket Sansar App
  { id: 'f1', name: 'Project_Brief_v1.pdf', type: 'pdf', size: '1.2 MB', by: 'Ahmad Karimi', date: '2026-05-08', projectId: 'p1', projectName: 'Cricket Sansar App', category: 'document' },
  { id: 'f2', name: 'API_Documentation_v2.pdf', type: 'pdf', size: '3.8 MB', by: 'Ahmad Karimi', date: '2026-05-11', projectId: 'p1', projectName: 'Cricket Sansar App', category: 'deliverable' },
  { id: 'f3', name: 'Architecture_Diagram.png', type: 'image', size: '0.9 MB', by: 'Usman Tariq', date: '2026-05-01', projectId: 'p1', projectName: 'Cricket Sansar App', category: 'reference' },
  { id: 'f4', name: 'Technical_Spec_v1.pdf', type: 'pdf', size: '2.4 MB', by: 'Ahmad Karimi', date: '2026-04-28', projectId: 'p1', projectName: 'Cricket Sansar App', category: 'document' },

  // Cricket Sansar Brand Identity
  { id: 'f5', name: 'CS_UI_Designs_v3.fig', type: 'figma', size: '12.4 MB', by: 'Sara Qureshi', date: '2026-05-10', projectId: 'p2', projectName: 'Cricket Sansar Brand Identity', category: 'deliverable' },
  { id: 'f6', name: 'Wireframes_v2.fig', type: 'figma', size: '8.7 MB', by: 'Sara Qureshi', date: '2026-05-01', projectId: 'p2', projectName: 'Cricket Sansar Brand Identity', category: 'deliverable' },
  { id: 'f7', name: 'Brand_Colors_Guide.pdf', type: 'pdf', size: '2.1 MB', by: 'Sara Qureshi', date: '2026-04-28', projectId: 'p2', projectName: 'Cricket Sansar Brand Identity', category: 'deliverable' },
  { id: 'f8', name: 'Logo_Concepts_v1.fig', type: 'figma', size: '5.3 MB', by: 'Bilal Ahmed', date: '2026-04-15', projectId: 'p2', projectName: 'Cricket Sansar Brand Identity', category: 'design' },

  // VPNGuider SEO Campaign
  { id: 'f9', name: 'SEO_Audit_Report.pdf', type: 'pdf', size: '4.2 MB', by: 'Zain Malik', date: '2026-05-05', projectId: 'p3', projectName: 'VPNGuider SEO Campaign', category: 'deliverable' },
  { id: 'f10', name: 'Content_Strategy_May.pdf', type: 'pdf', size: '1.8 MB', by: 'Hina Rizvi', date: '2026-04-30', projectId: 'p3', projectName: 'VPNGuider SEO Campaign', category: 'document' },
  { id: 'f11', name: 'Keyword_Research_v2.pdf', type: 'pdf', size: '0.9 MB', by: 'Zain Malik', date: '2026-04-25', projectId: 'p3', projectName: 'VPNGuider SEO Campaign', category: 'reference' },

  // Rahim Gul Transport Website
  { id: 'f12', name: 'Homepage_Design_v2.fig', type: 'figma', size: '9.1 MB', by: 'Sara Qureshi', date: '2026-05-09', projectId: 'p4', projectName: 'Rahim Gul Transport Website', category: 'deliverable' },
  { id: 'f13', name: 'Component_Library.fig', type: 'figma', size: '6.4 MB', by: 'Bilal Ahmed', date: '2026-05-03', projectId: 'p4', projectName: 'Rahim Gul Transport Website', category: 'design' },

  // Starr Luxury Cars Portal
  { id: 'f14', name: 'Technical_Spec.pdf', type: 'pdf', size: '2.6 MB', by: 'Ahmad Karimi', date: '2026-05-07', projectId: 'p5', projectName: 'Starr Luxury Cars Portal', category: 'document' },

  // Irene Teo Coaching
  { id: 'f15', name: 'Moodboard_v1.fig', type: 'figma', size: '3.2 MB', by: 'Bilal Ahmed', date: '2026-05-04', projectId: 'p6', projectName: 'Irene Teo Coaching Website', category: 'design' },
]

const FILE_TYPE_LABELS: Record<string, string> = {
  all: 'All Types',
  figma: 'Figma Files',
  pdf: 'PDF Documents',
  image: 'Images',
  doc: 'Documents',
  spreadsheet: 'Spreadsheets',
}

const TYPE_ICON_CONFIG: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  figma: { bg: 'rgba(122,63,217,0.1)', color: '#7A3FD9', icon: Layers },
  pdf: { bg: 'rgba(238,39,55,0.08)', color: '#EE2737', icon: FileText },
  image: { bg: 'rgba(251,191,36,0.1)', color: '#B47700', icon: Image },
  doc: { bg: 'rgba(14,139,154,0.1)', color: '#0E8B9A', icon: FileText },
  spreadsheet: { bg: 'rgba(31,157,85,0.1)', color: '#1F9D55', icon: Archive },
  archive: { bg: '#F2EDE4', color: '#877F71', icon: Archive },
}

function FileTypeIcon({ type }: { type: string }) {
  const s = TYPE_ICON_CONFIG[type] ?? { bg: '#F2EDE4', color: '#877F71', icon: FileText }
  const Icon = s.icon
  return (
    <div
      className="size-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: s.bg, color: s.color }}
    >
      <Icon size={16} />
    </div>
  )
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  deliverable: { bg: 'rgba(31,157,85,0.08)', text: '#1F9D55' },
  design: { bg: 'rgba(122,63,217,0.08)', text: '#7A3FD9' },
  document: { bg: 'rgba(14,139,154,0.08)', text: '#0E8B9A' },
  reference: { bg: '#F2EDE4', text: '#877F71' },
}

export default function ClientFilesPage() {
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'project'>('date')

  const projects = [
    { id: 'all', name: 'All Projects' },
    ...PROJECTS.slice(0, 6).map((p) => ({ id: p.id, name: p.name })),
  ]

  const filteredFiles = ALL_FILES.filter((f) => {
    const matchProject = projectFilter === 'all' || f.projectId === projectFilter
    const matchType = typeFilter === 'all' || f.type === typeFilter
    const matchSearch =
      search === '' ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.projectName.toLowerCase().includes(search.toLowerCase())
    return matchProject && matchType && matchSearch
  }).sort((a, b) => {
    if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime()
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'project') return a.projectName.localeCompare(b.projectName)
    return 0
  })

  // Group by project
  const grouped = filteredFiles.reduce<Record<string, ClientFile[]>>((acc, file) => {
    if (!acc[file.projectId]) acc[file.projectId] = []
    acc[file.projectId].push(file)
    return acc
  }, {})

  const totalSize = ALL_FILES.reduce((sum, f) => {
    const num = parseFloat(f.size)
    return sum + (isNaN(num) ? 0 : num)
  }, 0)

  const recentCount = ALL_FILES.filter(
    (f) => new Date(f.date) >= new Date('2026-05-05'),
  ).length

  return (
    <div className="py-10 font-ui" style={{ color: '#1A1612' }}>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-display font-bold text-[38px] leading-tight tracking-tight mb-1.5"
          style={{ color: '#1A1612' }}
        >
          Files &amp; Deliverables
        </h1>
        <p className="text-[15px]" style={{ color: '#4F4940' }}>
          {ALL_FILES.length} files delivered across {PROJECTS.slice(0, 6).length} projects ·{' '}
          {totalSize.toFixed(1)} MB total
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Files', value: ALL_FILES.length, icon: FileText, color: '#0E8B9A' },
          { label: 'Figma Files', value: ALL_FILES.filter((f) => f.type === 'figma').length, icon: Folder, color: '#7A3FD9' },
          { label: 'Documents', value: ALL_FILES.filter((f) => f.type === 'pdf').length, icon: Archive, color: '#EE2737' },
          { label: 'Added this week', value: recentCount, icon: Image, color: '#1F9D55' },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            whileHover={{ boxShadow: '0 4px 14px rgba(26,22,18,0.07)' }}
            className="bg-white border rounded-xl p-4 flex items-center gap-3.5"
            style={{ borderColor: '#EAE3D6' }}
          >
            <div
              className="size-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${s.color}18` }}
            >
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <p className="font-display font-bold text-[24px] leading-none" style={{ color: '#1A1612' }}>
                {s.value}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: '#877F71' }}>
                {s.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Project filter */}
        <div className="relative">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg text-[13px] border outline-none cursor-pointer"
            style={{ background: '#FFFFFF', borderColor: '#EAE3D6', color: '#1A1612' }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#877F71' }}>▾</span>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#EAE3D6' }}>
          {['all', 'figma', 'pdf', 'image'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
                typeFilter === t ? 'bg-client-surface shadow-sm font-semibold' : 'hover:bg-white/60',
              )}
              style={{ color: typeFilter === t ? '#1A1612' : '#4F4940' }}
            >
              {FILE_TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'project')}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg text-[13px] border outline-none cursor-pointer"
            style={{ background: '#FFFFFF', borderColor: '#EAE3D6', color: '#1A1612' }}
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="project">Sort by Project</option>
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#877F71' }}>▾</span>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B7AE9D' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-[13px] border outline-none"
            style={{ background: '#FFFFFF', borderColor: '#EAE3D6', color: '#1A1612' }}
          />
        </div>
      </div>

      {/* Files */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#877F71' }}>
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-display font-bold text-[17px]" style={{ color: '#1A1612' }}>
            No files found
          </p>
          <p className="text-[14px] mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : sortBy === 'project' || projectFilter === 'all' ? (
        /* Grouped view */
        <div className="space-y-8">
          {Object.entries(grouped).map(([projectId, files]) => {
            const project = PROJECTS.find((p) => p.id === projectId)
            if (!project) return null

            const SERVICE_DOT: Record<string, string> = {
              development: '#0E8B9A',
              design: '#7A3FD9',
              marketing: '#FBBF24',
            }

            return (
              <div key={projectId}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="size-2 rounded-full"
                    style={{ background: SERVICE_DOT[project.serviceType] }}
                  />
                  <h3
                    className="font-display font-semibold text-[15px]"
                    style={{ color: '#1A1612' }}
                  >
                    {project.name}
                  </h3>
                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded-xs"
                    style={{ background: '#EAE3D6', color: '#877F71' }}
                  >
                    {files.length} file{files.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {files.map((file) => (
                    <FileRow key={file.id} file={file} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Flat list */
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  )
}

function FileRow({ file }: { file: ClientFile }) {
  const catColor = CATEGORY_COLORS[file.category] ?? CATEGORY_COLORS.reference

  return (
    <motion.div
      className="flex items-center gap-3 p-4 rounded-xl bg-white border"
      style={{ borderColor: '#EAE3D6' }}
      whileHover={{ y: -2, boxShadow: '0 4px 14px rgba(26,22,18,0.07)' }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <FileTypeIcon type={file.type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[14px] font-semibold truncate" style={{ color: '#1A1612' }}>
            {file.name}
          </p>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xs whitespace-nowrap"
            style={{ background: catColor.bg, color: catColor.text }}
          >
            {file.category.charAt(0).toUpperCase() + file.category.slice(1)}
          </span>
        </div>
        <p className="text-[12px] font-mono" style={{ color: '#B7AE9D' }}>
          {file.by} · {formatDate(file.date)} · {file.size}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
          style={{ background: '#FAF7F2', border: '1px solid #EAE3D6', color: '#4F4940' }}
        >
          <Eye size={13} />
          Preview
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors hover:opacity-80"
          style={{ background: '#EE2737', color: 'white' }}
        >
          <Download size={13} />
          Download
        </button>
      </div>
    </motion.div>
  )
}
