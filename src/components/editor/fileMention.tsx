import Mention from '@tiptap/extension-mention'
import { PluginKey } from '@tiptap/pm/state'
import {
  FileText, FileSpreadsheet, Image as ImageIcon, FileVideo, Presentation, Link2, File as FileIcon,
} from 'lucide-react'
import { renderSuggestion } from './suggestionUtils'
import { SuggestionList } from './SuggestionList'

/** A project file/link that can be tagged inline with `#`. */
export interface FileMentionItem {
  id: string
  name: string
  kind: string
}

// Node name matches the `fileRef` convention already handled by richText.ts
// (docToPlainText) and the `.fileref` CSS class.
const FileRefBase = Mention.extend({ name: 'fileRef' })
const fileRefPluginKey = new PluginKey('fileRef')

function iconFor(kind: string) {
  switch (kind) {
    case 'link':   return <Link2 size={13} />
    case 'image':  return <ImageIcon size={13} />
    case 'video':  return <FileVideo size={13} />
    case 'sheet':  return <FileSpreadsheet size={13} />
    case 'slides': return <Presentation size={13} />
    case 'doc':
    case 'pdf':
    case 'text':   return <FileText size={13} />
    default:       return <FileIcon size={13} />
  }
}

/** Read-only variant for RichRenderer — parses stored #file nodes; no suggestion. */
export const FileRefRenderer = FileRefBase.configure({
  HTMLAttributes: { class: 'fileref' },
})

/** Editor variant — adds the `#` suggestion sourced from getItems(). */
export function fileRefExtension(getItems: () => FileMentionItem[]) {
  return FileRefBase.configure({
    HTMLAttributes: { class: 'fileref' },
    suggestion: {
      char: '#',
      pluginKey: fileRefPluginKey,
      items: ({ query }: { query: string }) =>
        getItems()
          .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8)
          .map((f) => ({ id: f.id, label: f.name, icon: iconFor(f.kind) })),
      render: renderSuggestion(SuggestionList),
    },
  })
}
