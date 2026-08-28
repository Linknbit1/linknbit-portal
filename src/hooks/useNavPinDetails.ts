import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchChannels } from '../api/channels'
import { fetchProjects } from '../api/projects'
import { fetchTasks } from '../api/tasks'
import { CHANNEL_KEYS } from './useChannels'
import { PROJECT_KEYS } from './useProjects'
import { TASK_KEYS } from './useTasks'
import { useAuthContext } from '../context/AuthContext'
import { channelTitle, dmCounterpart } from '../components/chat/chatUtils'
import type { NavPin } from '../api/navPins'

/** What a pin should look like in the sidebar. */
export interface PinPresentation {
  /** Short enough for a 248px rail. */
  label: string
  /** The whole thing, for the hover card, when it differs from the label. */
  full: string
  kind: 'channel' | 'dm' | 'project' | 'task' | 'other'
  /** DM pins show the person instead of an icon. */
  avatar?: { name: string; url: string | null }
}

const CHAT_RE    = /^\/chat\/([0-9a-f-]{36})/i
const PROJECT_RE = /^\/projects\/([0-9a-f-]{36})/i
const TASK_RE    = /^\/tasks\/([0-9a-f-]{36})/i
/** A task opened in its project's drawer: /projects/<id>?task=<id>. */
const DRAWER_RE  = /^\/projects\/[0-9a-f-]{36}\?.*\btask=([0-9a-f-]{36})/i

function idFrom(path: string, re: RegExp): string | null {
  return re.exec(path)?.[1] ?? null
}

/**
 * Resolves what each pin should show, from live data rather than the label
 * stored when it was pinned.
 *
 * Deriving beats storing here: a channel gets renamed, a project gets renamed,
 * and a pin created last month would go on showing the old name for ever with
 * no way to tell it had gone stale. The stored label stays as the fallback for
 * anything not recognised, and for the moment before the lookups land.
 *
 * Each lookup is enabled only when a pin of that kind exists, so somebody with
 * no pins, or only page pins, pays nothing for this.
 */
export function useNavPinDetails(pins: NavPin[]): Map<string, PinPresentation> {
  const { profile } = useAuthContext()

  const wants = useMemo(() => {
    let chat = false, project = false, task = false
    for (const p of pins) {
      if (CHAT_RE.test(p.path)) chat = true
      else if (DRAWER_RE.test(p.path) || TASK_RE.test(p.path)) { task = true; project = true }
      else if (PROJECT_RE.test(p.path)) project = true
    }
    return { chat, project, task }
  }, [pins])

  const { data: channels = [] } = useQuery({
    queryKey: CHANNEL_KEYS.all, queryFn: fetchChannels, enabled: wants.chat, staleTime: 60_000,
  })
  const { data: projects = [] } = useQuery({
    queryKey: PROJECT_KEYS.list({}), queryFn: () => fetchProjects({}), enabled: wants.project, staleTime: 60_000,
  })
  const { data: tasks = [] } = useQuery({
    queryKey: TASK_KEYS.all, queryFn: () => fetchTasks({}), enabled: wants.task, staleTime: 60_000,
  })

  return useMemo(() => {
    const out = new Map<string, PinPresentation>()

    for (const pin of pins) {
      const chatId = idFrom(pin.path, CHAT_RE)
      if (chatId) {
        const channel = channels.find((c) => c.id === chatId)
        if (!channel) { out.set(pin.id, { label: pin.label, full: pin.label, kind: 'channel' }); continue }
        const title = channelTitle(channel, profile?.id)
        const other = dmCounterpart(channel, profile?.id)
        out.set(pin.id, channel.kind === 'dm'
          ? { label: title, full: title, kind: 'dm', avatar: { name: title, url: other?.avatar_url ?? null } }
          : { label: title, full: title, kind: 'channel' })
        continue
      }

      const taskId = idFrom(pin.path, DRAWER_RE) ?? idFrom(pin.path, TASK_RE)
      if (taskId) {
        const task = tasks.find((t) => t.id === taskId)
        // "Task - <project>" rather than the task's own title: in a rail this
        // narrow the project is what tells you which task you meant, and two
        // tasks called "Fixes" are otherwise indistinguishable.
        const project = task?.project?.name ?? 'Task'
        out.set(pin.id, {
          label: `Task - ${project}`,
          full: task ? `${task.title} — ${project}` : pin.label,
          kind: 'task',
        })
        continue
      }

      const projectId = idFrom(pin.path, PROJECT_RE)
      if (projectId) {
        const project = projects.find((p) => p.id === projectId)
        const name = project?.name ?? pin.label
        out.set(pin.id, { label: name, full: name, kind: 'project' })
        continue
      }

      out.set(pin.id, { label: pin.label, full: pin.label, kind: 'other' })
    }

    return out
  }, [pins, channels, projects, tasks, profile?.id])
}
