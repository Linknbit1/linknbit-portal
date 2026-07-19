import { useEditor, EditorContent, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { cn } from '../../lib/cn'
import './editor.css'

interface RichRendererProps {
  doc: JSONContent | null | undefined
  className?: string
}

/**
 * Read-only rendering of stored rich content. Uses a non-editable TipTap instance
 * (ProseMirror renders safely — no dangerouslySetInnerHTML) so links, mentions and
 * formatting display exactly as authored.
 */
export function RichRenderer({ doc, className }: RichRendererProps) {
  const editor = useEditor(
    {
      editable: false,
      extensions: [
        StarterKit.configure({
          link: { openOnClick: true, protocols: ['http', 'https', 'mailto'], HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } },
        }),
        Mention.configure({ HTMLAttributes: { class: 'mention' } }),
      ],
      content: doc ?? undefined,
    },
    [doc],
  )

  if (!editor) return null
  return (
    <div className={cn('rich-content', className)}>
      <EditorContent editor={editor} />
    </div>
  )
}
