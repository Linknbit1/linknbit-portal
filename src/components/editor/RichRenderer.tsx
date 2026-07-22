import { useEditor, EditorContent, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { cn } from '../../lib/cn'
import { FileRefRenderer } from './fileMention'
import { useFileRefClick } from './useFileRefClick'
import './editor.css'

interface RichRendererProps {
  doc: JSONContent | null | undefined
  className?: string
}

/**
 * Read-only rendering of stored rich content. Uses a non-editable TipTap instance
 * (ProseMirror renders safely — no dangerouslySetInnerHTML) so links, mentions,
 * #file tags and formatting display exactly as authored. Clicking a #file tag opens
 * it in the in-app viewer.
 */
export function RichRenderer({ doc, className }: RichRendererProps) {
  const onFileRefClick = useFileRefClick()
  const editor = useEditor(
    {
      editable: false,
      extensions: [
        StarterKit.configure({
          link: { openOnClick: true, protocols: ['http', 'https', 'mailto'], HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } },
        }),
        Mention.configure({ HTMLAttributes: { class: 'mention' } }),
        FileRefRenderer,
      ],
      content: doc ?? undefined,
    },
    [doc],
  )

  if (!editor) return null
  return (
    <div className={cn('rich-content', className)} onClick={onFileRefClick}>
      <EditorContent editor={editor} />
    </div>
  )
}
