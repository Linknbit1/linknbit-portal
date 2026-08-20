import { useEffect, useState } from 'react'
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Unlink } from 'lucide-react'
import { cn } from '../../lib/cn'

interface StandupEntryEditorProps {
  value: JSONContent | null
  /** Fires on every change with both shapes — the plain text is what gets counted. */
  onChange: (doc: JSONContent, plainText: string) => void
  placeholder?: string
  className?: string
}

/**
 * The description editor for one standup task.
 *
 * Deliberately not the shared RichEditor: that one carries headings, code
 * blocks, slash commands and @mentions, none of which belong in "what did you
 * do on this task". Four marks, two lists and a link is the whole vocabulary —
 * a heading inside a two-sentence update is noise, and every extra affordance
 * is another thing to explain.
 *
 * The toolbar is always visible rather than a selection bubble: people writing
 * their first standup do not know to select text to discover formatting.
 */
export function StandupEntryEditor({ value, onChange, placeholder, className }: StandupEntryEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkVal, setLinkVal] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The whole point of this editor: no headings, no code, no quotes.
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        strike: false,
        link: {
          openOnClick: false,
          protocols: ['http', 'https', 'mailto'],
          autolink: true,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? 'What did you do on this task?' }),
    ],
    content: value ?? undefined,
    onUpdate: ({ editor: e }) => onChange(e.getJSON(), e.getText()),
    editorProps: {
      attributes: {
        class: 'min-h-20 px-3 py-2 focus:outline-none',
      },
    },
  })

  // Content set from outside (reopening a submitted standup to correct it).
  useEffect(() => {
    if (!editor || !value) return
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
    // Only when the incoming document itself changes — not on every keystroke,
    // which would fight the user for the cursor.
  }, [editor, value])

  if (!editor) return null

  const applyLink = () => {
    const url = linkVal.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (url) chain.setLink({ href: /^https?:\/\//i.test(url) ? url : `https://${url}` }).run()
    else chain.unsetLink().run()
    setLinkOpen(false)
    setLinkVal('')
  }

  return (
    <div className={cn('rich-editor rounded-md border border-border-default bg-surface-inset focus-within:border-border-focus', className)}>
      <div className="flex items-center gap-0.5 border-b border-border-subtle px-1.5 py-1">
        <ToolbarBtn active={editor.isActive('bold')} label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={13} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('italic')} label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={13} /></ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-border-subtle" />
        <ToolbarBtn active={editor.isActive('bulletList')} label="Bulleted list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={13} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('orderedList')} label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={13} /></ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-border-subtle" />
        {editor.isActive('link') ? (
          <ToolbarBtn active label="Remove link"
            onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}>
            <Unlink size={13} />
          </ToolbarBtn>
        ) : (
          <ToolbarBtn active={linkOpen} label="Add link"
            onClick={() => { setLinkOpen((v) => !v); setLinkVal('') }}><LinkIcon size={13} /></ToolbarBtn>
        )}

        {linkOpen && (
          <input
            autoFocus
            value={linkVal}
            onChange={(e) => setLinkVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') setLinkOpen(false)
            }}
            onBlur={applyLink}
            placeholder="Paste a link, then Enter"
            className="ml-1 h-6 flex-1 rounded-xs border border-border-default bg-surface-2 px-2 font-ui text-[11.5px] text-text-1 outline-none placeholder:text-text-4"
          />
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarBtn({ active, label, onClick, children }: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      // Keeps the caret where it is — a toolbar press must not steal focus and
      // collapse the selection it is about to format.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex size-6.5 items-center justify-center rounded-xs transition-colors',
        active ? 'bg-brand-red/15 text-brand-red' : 'text-text-3 hover:bg-surface-2 hover:text-text-1',
      )}
    >
      {children}
    </button>
  )
}
