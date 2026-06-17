import type { ReactNode } from 'react'
import { Topbar } from './Topbar'

interface StackScreenProps {
  title: string
  // `true` (default) = history back; a string = navigate to that path.
  back?: boolean | string
  children: ReactNode
}

// A drilled-in mobile screen: contextual header with a ‹ back affordance + a
// standard content container. Renders inside AppShell's <main>, whose bottom
// padding already clears the bottom tab bar.
export function StackScreen({ title, back = true, children }: StackScreenProps) {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title={title} back={back} />
      <div className="px-4 py-5 flex flex-col gap-5 w-full max-w-content mx-auto">
        {children}
      </div>
    </div>
  )
}
