/**
 * The offset a list's group heading pins at, so it lands directly under the
 * Topbar rather than behind it.
 *
 * The Topbar is `sticky top-0` inside the scrolling `<main>` and pads itself by
 * the safe-area inset, so both terms belong in the offset — without the inset a
 * heading slides a notch's worth of pixels out of sight on a phone.
 *
 * One constant because three lists pin headings this way (the roster, the
 * register, the requests queue) and a heading that stops half a bar short reads
 * as a rendering fault rather than a missing 8px.
 */
export const STICKY_UNDER_TOPBAR = 'top-[calc(var(--height-topbar)+env(safe-area-inset-top))]'
