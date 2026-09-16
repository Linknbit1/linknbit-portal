import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useEditor, EditorContent, type Editor, type JSONContent } from '@tiptap/react'
import { type EditorState } from '@tiptap/pm/state'
import { liftListItem, splitListItem } from '@tiptap/pm/schema-list'
import { splitBlock } from '@tiptap/pm/commands'
import './editor.css'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { Bold, Italic, Strikethrough, Code as CodeIcon, Link as LinkIcon, Check, Unlink } from 'lucide-react'
import { cn } from '../../lib/cn'
import { SlashCommand } from './slashCommand'
import { renderSuggestion, isSuggestionOpen } from './suggestionUtils'
import { SuggestionList } from './SuggestionList'
import type { PersonMini } from '../../api/projects'
import { fileRefExtension, type FileMentionItem } from './fileMention'
import { EVERYONE_MENTION_ID } from '../../lib/richText'
import { useFileRefClick } from './useFileRefClick'

/** True when the caret sits inside a list item, however deeply nested. */
function inListItem(state: EditorState): boolean {
  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === 'listItem') return true
  }
  return false
}

interface RichEditorProps {
  value: JSONContent | null
  onChange: (doc: JSONContent) => void
  /** Fires when focus leaves the editor — the point at which an edit is "done". */
  onBlur?: () => void
  placeholder?: string
  /** People available to @mention (kept fresh via a ref). */
  mentionItems?: PersonMini[]
  /** Offer @everyone in the mention list. Chat only — a task doc has no room to tag. */
  allowEveryone?: boolean
  /**
   * Teams offerable as @team-name. The id is the team's own uuid, which is what
   * lets the notifier tell a team tag from a person without a second field.
   */
  teamItems?: { id: string; name: string; color?: string | null }[]
  /** Project files/links taggable with # (kept fresh via a ref). */
  fileItems?: FileMentionItem[]
  /** Compact composer mode: Enter submits (Shift+Enter = newline). */
  compact?: boolean
  onSubmit?: () => void
  className?: string
  autoFocus?: boolean
  /** Hands the editor instance out so callers can insert content (e.g. emoji). */
  onEditorReady?: (editor: Editor) => void
  /**
   * Files arriving on the clipboard — a pasted screenshot, an image copied from
   * a page. Return true to consume the paste, which stops ProseMirror also
   * pasting whatever text or markup the clipboard carried alongside the file.
   */
  onPasteFiles?: (files: File[]) => boolean
}

export function RichEditor({
  value, onChange, onBlur, placeholder, mentionItems = [], allowEveryone, teamItems, fileItems, compact, onSubmit, className, autoFocus, onEditorReady, onPasteFiles,
}: RichEditorProps) {
  const mentionsRef = useRef(mentionItems)
  useEffect(() => { mentionsRef.current = mentionItems }, [mentionItems])
  const everyoneRef = useRef(allowEveryone)
  useEffect(() => { everyoneRef.current = allowEveryone }, [allowEveryone])
  const teamsRef = useRef(teamItems ?? [])
  useEffect(() => { teamsRef.current = teamItems ?? [] }, [teamItems])
  const filesRef = useRef(fileItems ?? [])
  useEffect(() => { filesRef.current = fileItems ?? [] }, [fileItems])
  const enableFileRefs = fileItems !== undefined
  const onFileRefClick = useFileRefClick()
  const onSubmitRef = useRef(onSubmit)
  useEffect(() => { onSubmitRef.current = onSubmit }, [onSubmit])
  const onBlurRef = useRef(onBlur)
  useEffect(() => { onBlurRef.current = onBlur }, [onBlur])
  const onPasteFilesRef = useRef(onPasteFiles)
  useEffect(() => { onPasteFilesRef.current = onPasteFiles }, [onPasteFiles])
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
          items: ({ query }) => {
            const q = query.toLowerCase()
            const people = mentionsRef.current
              .filter((p) => p.name.toLowerCase().includes(q))
              .slice(0, 8)
              .map((p) => ({ id: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } }))
            // Teams above people: there are few of them and they are the
            // broader stroke, so burying them under eight names would hide them.
            const teams = teamsRef.current
              .filter((t) => t.name.toLowerCase().includes(q))
              .slice(0, 4)
              // Carries the team's service colour so Design, Development and
              // Marketing read the same here as their chips do elsewhere.
              .map((t) => ({ id: t.id, label: t.name, color: t.color ?? undefined }))

            // Pinned to the very top, the way Discord lists it.
            return everyoneRef.current && 'everyone'.startsWith(q)
              ? [{ id: EVERYONE_MENTION_ID, label: 'everyone', avatar: { name: '@', url: null } }, ...teams, ...people]
              : [...teams, ...people]
          },
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
      /**
       * Enter, in a box whose Send is Ctrl+Enter.
       *
       * Decided here rather than in an extension's keyboard shortcuts, because
       * this prop is the only place asked before every plugin. StarterKit binds
       * Enter to splitting a list item and Shift+Enter to a hard break, and a
       * keymap of ours would be arguing with those over precedence instead of
       * simply going first.
       *
       * Ctrl/Cmd+Enter      sends, and is the only key that does. Enter is a
       *                     line, everywhere, so nothing half-written can leave
       *                     by a keystroke meant to break the line.
       * Outside a list      Enter and Shift+Enter both open the next line.
       * On a bullet         Shift+Enter starts the next bullet; Enter leaves the
       *                     list and carries on at the margin.
       * On an empty bullet  either of them ends the list — an empty bullet is
       *                     somebody finished with it, whichever they pressed.
       *
       * The new line is always a new block, never a hard break. An input rule
       * only fires at the start of a block, so after a <br> typing "- " stays
       * the two characters you typed instead of opening a list.
       */
      handleKeyDown: (view, event) => {
        // Not while a @mention, / command or # file list is open: there Enter
        // means "pick this one". Returning false hands the key to the suggestion
        // plugin, which ProseMirror only reaches after these props.
        if (!compact || event.key !== 'Enter' || isSuggestionOpen()) return false
        const { state } = view
        if (event.ctrlKey || event.metaKey) { onSubmitRef.current?.(); return true }

        const itemType = state.schema.nodes.listItem
        if (!itemType || !inListItem(state)) return splitBlock(state, view.dispatch)

        if (state.selection.$from.parent.content.size === 0) {
          return liftListItem(itemType)(state, view.dispatch)
        }
        if (event.shiftKey) return splitListItem(itemType)(state, view.dispatch)

        // Split first so the bullet keeps its text, then lift the new item that
        // split just made — lifting the one the caret is in would strip the
        // bullet off what is already written. The second call reads `view.state`
        // because the first has already moved it on.
        if (!splitListItem(itemType)(state, view.dispatch)) return false
        liftListItem(itemType)(view.state, view.dispatch)
        return true
      },
      // Before ProseMirror's own paste handling, deliberately: an image copied
      // from a web page arrives as a file AND as <img> markup, and letting both
      // through would attach the picture and paste a broken image beside it.
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? [])
        if (files.length === 0) return false
        return onPasteFilesRef.current?.(files) ?? false
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
