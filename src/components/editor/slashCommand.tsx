import { Extension, type Editor, type Range } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import { Heading1, Heading2, Heading3, List, ListOrdered, TextQuote, Minus, Code, Type } from 'lucide-react'
import { renderSuggestion } from './suggestionUtils'
import { SuggestionList, type SuggestionItem } from './SuggestionList'

interface SlashItem extends SuggestionItem {
  action: (editor: Editor, range: Range) => void
}

const ICON = 15

const ITEMS: SlashItem[] = [
  { label: 'Text', icon: <Type size={ICON} />, action: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  { label: 'Heading 1', icon: <Heading1 size={ICON} />, action: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2', icon: <Heading2 size={ICON} />, action: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3', icon: <Heading3 size={ICON} />, action: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 3 }).run() },
  { label: 'Bulleted list', icon: <List size={ICON} />, action: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { label: 'Numbered list', icon: <ListOrdered size={ICON} />, action: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { label: 'Quote', icon: <TextQuote size={ICON} />, action: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { label: 'Code block', icon: <Code size={ICON} />, action: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { label: 'Divider', icon: <Minus size={ICON} />, action: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
]

export const slashSuggestion = {
  char: '/',
  startOfLine: false,
  items: ({ query }: { query: string }) =>
    ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())),
  command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashItem }) => {
    props.action(editor, range)
  },
  render: renderSuggestion(SuggestionList),
}

/** Slash "/" command menu — insert headings, lists, quote, divider, etc. */
export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...slashSuggestion })]
  },
})
