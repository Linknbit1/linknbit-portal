import { Construction } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'

interface PlaceholderPageProps {
  title: string
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title={title} />
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-8">
        <div className="w-14 h-14 rounded-xl bg-surface-2 border border-border-default flex items-center justify-center">
          <Construction size={24} className="text-text-3" />
        </div>
        <h2 className="font-display font-semibold text-h3 text-text-1 tracking-tight">{title}</h2>
        <p className="text-body text-text-3 max-w-sm">
          This section is coming soon. The design and functionality will be implemented here.
        </p>
      </div>
    </div>
  )
}
