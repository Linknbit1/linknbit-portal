import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useEditor, EditorContent, type Editor, type JSONContent } from '@tiptap/react'
import './editor.css'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { Bold, Italic, Strikethrough, Code as CodeIcon, Link as LinkIcon, Check, Unlink } from 'lucide-react'
import { cn } from '../../lib/cn'
import { SlashCommand } from './slashCommand'
import { renderSuggestion } from './suggestionUtils'
import { SuggestionList } from './SuggestionList'
import type { PersonMini } from '../../api/projects'
import { fileRefExtension, type FileMentionItem } from './fileMention'
import { useFileRefClick } from './useFileRefClick'

interface RichEditorProps {
  value: JSONContent | null
  onChange: (doc: JSONContent) => void
  /** Fires when focus leaves the editor — the point at which an edit is "done". */
  onBlur?: () => void
  placeholder?: string
  /** People available to @mention (kept fresh via a ref). */
  mentionItems?: PersonMini[]
  /** Project files/links taggable with # (kept fresh via a ref). */
  fileItems?: FileMentionItem[]
  /** Compact composer mode: Enter submits (Shift+Enter = newline). */
  compact?: boolean
  onSubmit?: () => void
  className?: string
  autoFocus?: boolean
  /** Hands the editor instance out so callers can insert content (e.g. emoji). */
  onEditorReady?: (editor: Editor) => void
}

export function RichEditor({
  value, onChange, onBlur, placeholder, mentionItems = [], fileItems, compact, onSubmit, className, autoFocus, onEditorReady,
}: RichEditorProps) {
  const mentionsRef = useRef(mentionItems)
  useEffect(() => { mentionsRef.current = mentionItems }, [mentionItems])
  const filesRef = useRef(fileItems ?? [])
  useEffect(() => { filesRef.current = fileItems ?? [] }, [fileItems])
  const enableFileRefs = fileItems !== undefined
  const onFileRefClick = useFileRefClick()
  const onSubmitRef = useRef(onSubmit)
  useEffect(() => { onSubmitRef.current = onSubmit }, [onSubmit])
  const onBlurRef = useRef(onBlur)
  useEffect(() => { onBlurRef.current = onBlur }, [onBlur])
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkVal, setLinkVal] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: true,
          protocols: ['http', 'https', 'mailto'],
          autolink: true,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
        },
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: placeholder ?? 'Type / for commands…' }),
      // eslint-disable-next-line react-hooks/refs -- items() runs on suggestion trigger, not during render; the ref keeps the people list fresh without re-creating the editor.
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: {
          char: '@',
          items: ({ query }) =>
            mentionsRef.current
              .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 8)
              .map((p) => ({ id: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } })),
          render: renderSuggestion(SuggestionList),
        },
      }),
      SlashCommand,
      // eslint-disable-next-line react-hooks/refs -- items() runs on trigger, not render; the ref keeps files fresh without recreating the editor.
      ...(enableFileRefs ? [fileRefExtension(() => filesRef.current)] : []),
    ],
    content: value ?? undefined,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: { class: 'prose-editor focus:outline-none' },
      handleKeyDown: (_view, event) => {
        if (compact && event.key === 'Enter' && !event.shiftKey) {
          onSubmitRef.current?.()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getJSON()),
    // Read through a ref: the editor is created once, so a prop captured here
    // would go stale (same reason mentions/files use refs above).
    onBlur: () => onBlurRef.current?.(),
  })

  // NOTE: content is intentionally set only at editor creation (`content: value`).
  // We must NOT sync the `value` prop back into the editor while it's mounted: the
  // parent autosaves and re-feeds project.doc, so a re-sync would overwrite whatever
  // the user typed during the save round-trip (data loss). All call sites remount via
  // `key` when the underlying record changes, which is the correct reset path.

  const onReadyRef = useRef(onEditorReady)
  useEffect(() => { onReadyRef.current = onEditorReady }, [onEditorReady])
  useEffect(() => { if (editor) onReadyRef.current?.(editor) }, [editor])

  if (!editor) return null

  const applyLink = () => {
    const url = linkVal.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (url) chain.setLink({ href: url }).run()
    else chain.unsetLink().run()
    setLinkOpen(false)
  }
  const removeLink = () => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); setLinkOpen(false) }
  const openLinkInput = () => {
    const href = editor.getAttributes('link').href
    setLinkVal(typeof href === 'string' ? href : '')
    setLinkOpen(true)
  }

  return (
    <div className={cn('rich-editor', className)} onClick={onFileRefClick}>
      <BubbleMenu editor={editor} className="flex items-center gap-0.5 bg-surface-2 border border-border-strong rounded-md shadow-lg p-1">
        {linkOpen ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={linkVal}
              onChange={(e) => setLinkVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } else if (e.key === 'Escape') { setLinkOpen(false) } }}
              onBlur={() => setLinkOpen(false)}
              placeholder="https://…"
              className="h-7 w-48 bg-surface-inset border border-border-default rounded-sm px-2 font-ui text-[12px] text-text-1 placeholder:text-text-4 focus:outline-none focus:border-border-focus"
            />
            <button onMouseDown={(e) => e.preventDefault()} onClick={applyLink} className="size-7 rounded-sm flex items-center justify-center text-success hover:bg-surface-3" aria-label="Apply link"><Check size={14} /></button>
            {editor.isActive('link') && (
              <button onMouseDown={(e) => e.preventDefault()} onClick={removeLink} className="size-7 rounded-sm flex items-center justify-center text-error hover:bg-surface-3" aria-label="Remove link"><Unlink size={14} /></button>
            )}
          </div>
        ) : (
          <>
            <BubbleBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></BubbleBtn>
            <BubbleBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></BubbleBtn>
            <BubbleBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></BubbleBtn>
            <BubbleBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><CodeIcon size={14} /></BubbleBtn>
            <BubbleBtn active={editor.isActive('link')} onClick={openLinkInput}><LinkIcon size={14} /></BubbleBtn>
          </>
        )}
      </BubbleMenu>
      <EditorContent editor={editor} />
    </div>
  )
}

function BubbleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('size-7 rounded-sm flex items-center justify-center transition-colors', active ? 'bg-brand-red text-white' : 'text-text-2 hover:bg-surface-3')}
    >
      {children}
    </button>
  )
}
