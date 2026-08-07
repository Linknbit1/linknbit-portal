/**
 * Scrolls whichever ancestor actually scrolls back to the top.
 *
 * The app shell puts `overflow-y-auto` on `<main>`, so the document itself never
 * scrolls and `window.scrollTo` is a silent no-op on every internal page. Walking
 * up from the element keeps that knowledge out of the pages — nothing here has to
 * know the shell's markup, and it still works if the scroller moves.
 */
export function scrollAncestorToTop(from: Element | null, behavior: ScrollBehavior = 'smooth'): void {
  let el: Element | null = from
  while (el) {
    const style = getComputedStyle(el)
    if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(style.overflowY)) {
      el.scrollTo({ top: 0, behavior })
      return
    }
    el = el.parentElement
  }
  window.scrollTo({ top: 0, behavior })
}
