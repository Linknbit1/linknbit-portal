import { ReactRenderer, type Editor } from '@tiptap/react'
import type { ComponentType } from 'react'

/** Ref API a suggestion list must expose so the editor can forward key events. */
export interface SuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

type ClientRect = (() => DOMRect | null) | null | undefined

interface RenderProps {
  editor: unknown
  clientRect?: ClientRect
}

/**
 * Builds the `render` function TipTap's Suggestion plugin expects, mounting a
 * React list component in a fixed-position popup near the caret. Positioning is
 * manual (no tippy/floating-ui dependency): we read the suggestion clientRect
 * and clamp to the viewport. Generic over the list component's props — TipTap
 * passes `{ items, command, … }` at runtime, hence the justified casts below.
 */
export function renderSuggestion<P extends object>(List: ComponentType<P>) {
  return () => {
    let component: ReactRenderer<unknown, P> | null = null

    const place = (clientRect: ClientRect) => {
      if (!component) return
      const el = component.element as HTMLElement
      el.style.position = 'fixed'
      el.style.zIndex = '70'
      const rect = clientRect?.()
      if (!rect) return
      const h = el.offsetHeight || 240
      const spaceBelow = window.innerHeight - rect.bottom
      // Flip above the caret when there isn't room below (comment composers etc.).
      const openUp = spaceBelow < h + 12 && rect.top > h + 12
      const top = openUp ? Math.max(8, rect.top - h - 6) : rect.bottom + 6
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 268))
      el.style.top = `${top}px`
      el.style.left = `${left}px`
    }

    return {
      onStart: (props: RenderProps) => {
        // TipTap's suggestion runtime supplies { items, command, … } as the props;
        // the editor is an Editor at runtime. Types can't express this contract.
        component = new ReactRenderer(List, { props: props as unknown as P, editor: props.editor as Editor })
        document.body.appendChild(component.element)
        place(props.clientRect)
      },
      onUpdate: (props: RenderProps) => {
        component?.updateProps(props)
        place(props.clientRect)
      },
      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === 'Escape') return true
        const ref = component?.ref
        // ReactRenderer.ref is the mounted component instance (our SuggestionListRef).
        if (ref && typeof (ref as SuggestionListRef).onKeyDown === 'function') {
          return (ref as SuggestionListRef).onKeyDown(props)
        }
        return false
      },
      onExit: () => {
        component?.element.remove()
        component?.destroy()
        component = null
      },
    }
  }
}

/** Shared popup container classes for suggestion lists. */
export const SUGGESTION_MENU_CLASS =
  'min-w-56 max-w-68 max-h-64 overflow-y-auto bg-surface-2 border border-border-strong rounded-md shadow-lg p-1'
