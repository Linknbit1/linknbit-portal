import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Measured height of an element, kept current as it resizes.
 *
 * For stacking sticky headers: each layer has to sit at the combined height of
 * the ones above it, and those heights are not knowable up front — a wrapping
 * filter toolbar is two rows on a laptop and four on a narrow window. Feeding
 * the measurement into a CSS custom property lets the offsets stay correct
 * without hardcoding a number that a reflow would invalidate.
 *
 * Returns 0 while unmounted and for a `display: none` element, which is the
 * right answer for an offset — a hidden layer takes up no stack.
 */
export function useElementHeight<T extends HTMLElement>(): [(node: T | null) => void, number] {
  const [height, setHeight] = useState(0)
  const observerRef = useRef<ResizeObserver | null>(null)

  // Callback ref rather than useRef + useEffect: the node can arrive later than
  // the effect would run (conditional rendering), and this reattaches on swap.
  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect()
    if (!node) {
      setHeight(0)
      return
    }
    setHeight(node.getBoundingClientRect().height)
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.target.getBoundingClientRect().height)
    })
    observer.observe(node)
    observerRef.current = observer
  }, [])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return [ref, height]
}
