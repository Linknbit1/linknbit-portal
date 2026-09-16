import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { JSONContent } from '@tiptap/react'
import { RichEditor } from './src/components/editor/RichEditor'
import './src/index.css'

function Probe() {
  const [doc, setDoc] = useState<JSONContent | null>(null)
  const [sent, setSent] = useState(0)
  return (
    <div className="p-6 bg-bg-base min-h-screen">
      <div className="border border-border-default p-3 w-[600px]">
        <RichEditor value={null} onChange={setDoc} compact onSubmit={() => setSent((s) => s + 1)} autoFocus />
      </div>
      <pre id="out" className="mt-4 text-text-1 text-xs">{JSON.stringify({ sent, doc })}</pre>
    </div>
  )
}
createRoot(document.getElementById('root')!).render(<Probe />)
