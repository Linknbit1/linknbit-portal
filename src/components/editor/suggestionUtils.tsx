import { ReactRenderer, type Editor } from '@tiptap/react'
import type { ComponentType } from 'react'

const SUGGESTION_OPEN_ATTR = 'data-suggestion-open'

/**
 * Is a suggestion list on screen right now?
 *
 * The composer submits on Enter, and ProseMirror asks `editorProps.handleKeyDown`
 * before it asks any plugin — so without this check, Enter sent the message
 * instead of picking the person you were half way through @mentioning.
 */
export function isSuggestionOpen(): boolean {
  return !!document.querySelector(`[${SUGGESTION_OPEN_ATTR}]`)
}

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

    const MARGIN = 8 // viewport gutter
    const GAP = 6    // breathing room between caret and popup

    const place = (clientRect: ClientRect) => {
      if (!component) return
      const el = component.element as HTMLElement
      el.style.position = 'fixed'
      el.style.zIndex = '70'
      const rect = clientRect?.()
      if (!rect) return

      // The scrollable list is the child; capping ITS height is what keeps the
      // popup inside the viewport (the wrapper has no overflow of its own).
      const list = (el.firstElementChild as HTMLElement | null) ?? el
      list.style.maxHeight = ''
      const natural = el.offsetHeight || list.scrollHeight || 240

      const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN
      const spaceAbove = rect.top - GAP - MARGIN
      // Open upward when below can't fit the list and above has more room — the
      // usual case for a composer pinned to the bottom of the screen.
      const openUp = natural > spaceBelow && spaceAbove > spaceBelow
      const available = Math.max(120, openUp ? spaceAbove : spaceBelow)
      const height = Math.min(natural, available)

      list.style.maxHeight = `${available}px`
      const top = openUp ? Math.max(MARGIN, rect.top - GAP - height) : rect.bottom + GAP
      const width = el.offsetWidth || 268
      const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - width - MARGIN))
      el.style.top = `${top}px`
      el.style.left = `${left}px`
    }

    /**
     * ReactRenderer mounts asynchronously, so the first measurement reads a
     * height of 0. Re-place on the next frame with the real dimensions.
     */
    const placeAfterPaint = (clientRect: ClientRect) => {
      place(clientRect)
      requestAnimationFrame(() => place(clientRect))
    }

    return {
      onStart: (props: RenderProps) => {
        // TipTap's suggestion runtime supplies { items, command, … } as the props;
        // the editor is an Editor at runtime. Types can't express this contract.
        component = new ReactRenderer(List, { props: props as unknown as P, editor: props.editor as Editor })
        // Marks the popup as open for isSuggestionOpen() below. An attribute on
        // the element itself rather than a counter: if a popup is ever torn down
        // without onExit, the mark goes with the element, where a counter would
        // stay stuck and break the Enter key for the rest of the session.
        component.element.setAttribute(SUGGESTION_OPEN_ATTR, '')
        document.body.appendChild(component.element)
        placeAfterPaint(props.clientRect)
      },
      onUpdate: (props: RenderProps) => {
        component?.updateProps(props)
        // The filtered list changes length as you type, so re-measure after paint.
        placeAfterPaint(props.clientRect)
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
