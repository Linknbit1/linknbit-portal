import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Loader2, Maximize2, Minus, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Popover } from '../components/ui/Popover'
import { useToast } from '../components/ui/toast-context'
import { useAuthContext } from '../context/AuthContext'
import {
  useCreateStickyNote,
  useDeleteStickyNote,
  useStickyNotes,
  useUpdateStickyNote,
} from '../hooks/useStickyNotes'
import { useRealtimeStickyNotes } from '../hooks/realtime/useRealtimeStickyNotes'
import { NOTE_COLORS, NOTE_SHAPES, type NoteColor, type NoteShape, type StickyNote } from '../api/stickyNotes'
import { cn } from '../lib/cn'

/** Note edge length in board units. */
const NOTE_SIZE = 232

/** The board is a fixed canvas that the viewport pans across. */
const BOARD_W = 2600
const BOARD_H = 1800

/** Absolute floor; the effective minimum is whatever keeps the board covering the viewport. */
const MIN_ZOOM = 0.35
const MAX_ZOOM = 2.5
const ZOOM_STEP = 1.2

/** Slightly in, so notes open at a comfortable reading size rather than 1:1. */
const DEFAULT_ZOOM = 1.25

/**
 * Wheel-to-zoom feel.
 *
 * A mouse notch reports a deltaY of 100 or more while a trackpad pinch reports
 * single digits many times a second, so one coefficient cannot serve both: tuned
 * for the trackpad, a single notch of the wheel multiplied the zoom by e — the
 * 53%-to-144% jump. Clamping the per-event delta first bounds what one notch can
 * do without flattening the pinch, which simply accumulates over its many small
 * events.
 */
const ZOOM_WHEEL_SENSITIVITY = 0.006
const ZOOM_WHEEL_MAX_DELTA = 24

const BOARD_CENTRE = { x: BOARD_W / 2, y: BOARD_H / 2 }

interface View { zoom: number; x: number; y: number }

/**
 * Keep the cork covering the viewport at all times.
 *
 * Without this you can zoom or pan past the edge of the board and see bare
 * background where the texture stops. Zooming out is therefore limited to the
 * point where the board still fills the frame, and panning is bounded by the
 * board's edges — the same way a physical board cannot be slid off the wall.
 */
function clampView(next: View, vw: number, vh: number): View {
  const floor = Math.max(MIN_ZOOM, vw / BOARD_W, vh / BOARD_H)
  const zoom = Math.min(MAX_ZOOM, Math.max(floor, next.zoom))
  return {
    zoom,
    x: Math.min(0, Math.max(vw - BOARD_W * zoom, next.x)),
    y: Math.min(0, Math.max(vh - BOARD_H * zoom, next.y)),
  }
}

const minZoomFor = (vw: number, vh: number) =>
  Math.max(MIN_ZOOM, vw / BOARD_W, vh / BOARD_H)

/**
 * Put a board-space point in the middle of the frame.
 *
 * The board is far larger than the viewport, so parking at 0,0 drops you in its
 * top-left corner — something you only notice once you zoom out far enough to
 * see two edges at once.
 */
const viewCentredOn = (
  focus: { x: number; y: number },
  zoom: number,
  vw: number,
  vh: number,
): View => clampView({ zoom, x: vw / 2 - focus.x * zoom, y: vh / 2 - focus.y * zoom }, vw, vh)

const COLOR_CLASS: Record<NoteColor, string> = {
  pink: 'bg-note-pink',
  lavender: 'bg-note-lavender',
  mint: 'bg-note-mint',
  peach: 'bg-note-peach',
  butter: 'bg-note-butter',
  sky: 'bg-note-sky',
}

/**
 * What each colour actually looks like now.
 *
 * The slugs are stored in `sticky_notes.color` and predate the dark repaint, so
 * they say pink and butter while the paint says teal and mustard. Renaming them
 * would orphan every saved note; labelling them here costs nothing and stops the
 * picker offering a "pink" swatch that is plainly green.
 */
const COLOR_LABEL: Record<NoteColor, string> = {
  mint: 'Jade',
  pink: 'Teal',
  sky: 'Ocean',
  lavender: 'Indigo',
  peach: 'Emerald',
  butter: 'Mustard',
}

const SHAPE_LABEL: Record<NoteShape, string> = {
  square: 'Square',
  folded: 'Folded',
  torn: 'Torn',
  wavy: 'Wavy',
  tag: 'Tag',
  petal: 'Petal',
  ticket: 'Ticket',
  scallop: 'Scallop',
  parallelogram: 'Slant',
  star: 'Star',
  house: 'House',
  bubble: 'Bubble',
  hexagon: 'Hexagon',
  pennant: 'Pennant',
}

/**
 * Every silhouette is expressed in percentages so it tracks NOTE_SIZE — nothing
 * here needs recomputing if the notes are resized again.
 */
const SHAPE_STYLE: Record<NoteShape, { clipPath?: string; borderRadius?: string }> = {
  square: { borderRadius: '8px' },
  folded: { clipPath: 'polygon(0 0, 100% 0, 100% 74%, 74% 100%, 0 100%)' },
  torn: {
    clipPath:
      'polygon(0 0, 100% 0, 100% 88%, 90% 96%, 80% 88%, 70% 97%, 60% 88%, 50% 96%, 40% 88%, 30% 97%, 20% 88%, 10% 96%, 0 88%)',
  },
  // Ripple down both sides, like paper cut with pinking shears.
  wavy: {
    clipPath:
      'polygon(0 0, 100% 0, 96% 12%, 100% 25%, 96% 38%, 100% 50%, 96% 62%, 100% 75%, 96% 88%, 100% 100%, 0 100%, 4% 88%, 0 75%, 4% 62%, 0 50%, 4% 38%, 0 25%, 4% 12%)',
  },
  // Luggage-tag: chamfered top corners, pointed foot.
  tag: { clipPath: 'polygon(18% 0, 82% 0, 100% 14%, 100% 82%, 50% 100%, 0 82%, 0 14%)' },
  // Leaf: two sharp corners on one diagonal, two round on the other.
  petal: { borderRadius: '64% 10% 64% 10%' },
  // Cinema ticket: notched waist on both sides.
  ticket: {
    clipPath:
      'polygon(0 0, 100% 0, 100% 42%, 94% 50%, 100% 58%, 100% 100%, 0 100%, 0 58%, 6% 50%, 0 42%)',
  },
  // Doily edge along the bottom.
  scallop: {
    clipPath:
      'polygon(0 0, 100% 0, 100% 86%, 94% 94%, 88% 86%, 81% 94%, 75% 86%, 69% 94%, 63% 86%, 56% 94%, 50% 86%, 44% 94%, 38% 86%, 31% 94%, 25% 86%, 19% 94%, 13% 86%, 6% 94%, 0 86%)',
  },
  parallelogram: { clipPath: 'polygon(16% 0, 100% 0, 84% 100%, 0 100%)' },
  /*
   * Fat-armed star, sized to the largest that fits: outer radius 51.5%, inner
   * 33.5%, against 19% inner on the original icon-proportioned version.
   *
   * A point-up star is wider than it is tall, so width is the binding
   * constraint — 2·cos(18°)·R must stay inside the box, which caps R at ~51.5%.
   * The centre is dropped to 52.5% so the top point still starts at the very top
   * edge; the leftover room ends up under the bottom points, where nothing is
   * drawn anyway. Growing it further would need a bigger note, not a bigger
   * polygon, and the other thirteen shapes share NOTE_SIZE.
   */
  star: {
    clipPath:
      'polygon(50% 1%, 69.7% 25.4%, 99% 36.6%, 81.9% 62.9%, 80.3% 94.2%, 50% 86%, 19.7% 94.2%, 18.1% 62.9%, 1% 36.6%, 30.3% 25.4%)',
  },
  house: { clipPath: 'polygon(50% 0, 100% 34%, 100% 100%, 0 100%, 0 34%)' },
  // Speech bubble with a tail off the bottom-left.
  bubble: {
    clipPath: 'polygon(0 0, 100% 0, 100% 76%, 38% 76%, 20% 98%, 22% 76%, 0 76%)',
  },
  hexagon: { clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' },
  // Pennant / bunting flag, notched at the foot.
  pennant: { clipPath: 'polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%)' },
}

/**
 * Text has to stay inside the silhouette, so tighter shapes get more inset.
 * Percentages rather than fixed spacing, so they track NOTE_SIZE.
 */
const TEXT_INSET: Record<NoteShape, React.CSSProperties> = {
  square: { inset: '9%' },
  folded: { top: '9%', left: '9%', right: '9%', bottom: '24%' },
  torn: { top: '9%', left: '9%', right: '9%', bottom: '18%' },
  wavy: { top: '9%', left: '12%', right: '12%', bottom: '9%' },
  tag: { top: '14%', left: '11%', right: '11%', bottom: '22%' },
  petal: { inset: '19%' },
  ticket: { top: '9%', left: '12%', right: '12%', bottom: '9%' },
  scallop: { top: '9%', left: '9%', right: '9%', bottom: '20%' },
  parallelogram: { top: '10%', left: '18%', right: '18%', bottom: '10%' },
  // Centred on 52.5% with the core, and kept just inside the 33.5% inner radius
  // so even the corners of the text box stay on paper.
  star: { top: '27%', left: '27%', right: '27%', bottom: '12%' },
  house: { top: '40%', left: '10%', right: '10%', bottom: '9%' },
  bubble: { top: '9%', left: '9%', right: '9%', bottom: '28%' },
  hexagon: { top: '14%', left: '17%', right: '17%', bottom: '14%' },
  pennant: { top: '9%', left: '9%', right: '9%', bottom: '24%' },
}

/**
 * Where the pin pierces each shape, as a percentage of the note box.
 *
 * This is per-shape because "top centre" is not paper on every silhouette — a
 * star and a house both come to a point there, so the pin would hang in space.
 * The paper also rotates about this exact point, so the pin and the hole it
 * makes stay together at any angle.
 */
const PIN_ANCHOR: Record<NoteShape, { x: number; y: number }> = {
  square: { x: 50, y: 9 },
  folded: { x: 50, y: 9 },
  torn: { x: 50, y: 9 },
  wavy: { x: 50, y: 9 },
  tag: { x: 50, y: 11 },
  petal: { x: 52, y: 12 },
  ticket: { x: 50, y: 9 },
  scallop: { x: 50, y: 9 },
  // Top edge runs from 16% to 100%, so its midpoint sits right of centre.
  parallelogram: { x: 58, y: 10 },
  // Just below where the top arm meets the body, which the fatter core moved up.
  star: { x: 50, y: 20 },
  // On the roof face, below the apex where the paper is wide enough.
  house: { x: 50, y: 20 },
  bubble: { x: 50, y: 10 },
  hexagon: { x: 50, y: 11 },
  pennant: { x: 50, y: 9 },
}

/**
 * Pin geometry in the rendered SVG (36 × 42 px, viewBox 44 × 52, needle tip at
 * 22,50). Used to sit the tip exactly on the anchor rather than eyeballing it.
 */
const PIN_TIP_X = (22 / 44) * 36
const PIN_TIP_Y = (50 / 52) * 42

/**
 * The pin's head sticks out above the sheet, so notes are kept clear of the top
 * edge — otherwise the board's clipping would slice the pin in half.
 */
const PIN_HEADROOM = Math.ceil(PIN_TIP_Y)

/**
 * A pushpin, drawn rather than styled.
 *
 * CSS cannot express the two things that sell it: a metal needle needs a
 * left-to-right light/dark/light ramp to read as a cylinder, and the dome needs
 * an off-centre specular highlight. Both are gradients on real geometry here.
 *
 * The pin deliberately does NOT inherit the note's rotation — a real pin is
 * pushed in at its own angle regardless of how the paper sits — and it keeps
 * its red across themes, because it is a physical object on the board rather
 * than part of the interface.
 */
function PushpinDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        <radialGradient id="pinDome" cx="0.34" cy="0.28" r="0.78">
          <stop offset="0%" stopColor="#FF8A8A" />
          <stop offset="38%" stopColor="#F03446" />
          <stop offset="78%" stopColor="#C4121F" />
          <stop offset="100%" stopColor="#8E0B15" />
        </radialGradient>
        {/* Cylindrical shading: bright band left of centre, falling off both ways. */}
        <linearGradient id="pinCap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8E0B15" />
          <stop offset="22%" stopColor="#E23346" />
          <stop offset="42%" stopColor="#FF8C8C" />
          <stop offset="62%" stopColor="#E02334" />
          <stop offset="100%" stopColor="#870A14" />
        </linearGradient>
        <radialGradient id="pinCapTop" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0%" stopColor="#FF9A9A" />
          <stop offset="100%" stopColor="#D01B2B" />
        </radialGradient>
        <linearGradient id="pinNeedle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5C646F" />
          <stop offset="30%" stopColor="#DFE6ED" />
          <stop offset="50%" stopColor="#FBFDFF" />
          <stop offset="72%" stopColor="#9AA4B0" />
          <stop offset="100%" stopColor="#525A65" />
        </linearGradient>
        <radialGradient id="pinShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(0,0,0,0.38)" />
          <stop offset="60%" stopColor="rgba(0,0,0,0.16)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function Pushpin() {
  return (
    <svg viewBox="0 0 44 52" className="w-9 h-10.5 overflow-visible" aria-hidden="true">
      {/* Cast shadow lies flat on the paper, so it sits outside the tilted group. */}
      <ellipse cx="29" cy="48.5" rx="14" ry="3" fill="url(#pinShadow)" />

      <g transform="rotate(17 22 50)">
        {/* Needle, tapering to the point where it enters the paper. */}
        <path d="M20.8 28 L23.2 28 L22.45 50 L21.55 50 Z" fill="url(#pinNeedle)" />

        {/* Dome */}
        <path
          d="M9 30.5 C9 18.5 13.6 11 22 11 C30.4 11 35 18.5 35 30.5 C35 34.3 29.2 36.8 22 36.8 C14.8 36.8 9 34.3 9 30.5 Z"
          fill="url(#pinDome)"
        />
        {/* Contact shading where the dome meets the needle. */}
        <ellipse cx="22" cy="35.4" rx="8.4" ry="2.2" fill="#7C0A13" opacity="0.5" />

        {/* Grip cylinder */}
        <path
          d="M15.6 7.2 C15.6 5.3 18.5 4 22 4 C25.5 4 28.4 5.3 28.4 7.2 L28.4 14.4 C28.4 16.3 25.5 17.6 22 17.6 C18.5 17.6 15.6 16.3 15.6 14.4 Z"
          fill="url(#pinCap)"
        />
        <ellipse cx="22" cy="7.1" rx="6.4" ry="3.1" fill="url(#pinCapTop)" />

        {/* Specular highlight — the single detail that makes the dome read as 3D. */}
        <ellipse
          cx="16.4"
          cy="20.5"
          rx="3.5"
          ry="6.2"
          fill="#FFFFFF"
          opacity="0.5"
          transform="rotate(-24 16.4 20.5)"
        />
      </g>
    </svg>
  )
}

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

interface CustomNoteDialogProps {
  open: boolean
  onClose: () => void
  onPin: (color: NoteColor, shape: NoteShape) => void
  pinning: boolean
}

/**
 * Colour and shape picker for a deliberate note, as opposed to the random one
 * the main button pins.
 *
 * Every shape tile is drawn with the chosen colour rather than a neutral swatch,
 * so the grid is a preview of the actual note — picking a colour repaints all
 * fourteen at once. The tiles reuse SHAPE_STYLE directly, which is why they stay
 * correct if a silhouette is ever adjusted.
 */
function CustomNoteDialog({ open, onClose, onPin, pinning }: CustomNoteDialogProps) {
  const [color, setColor] = useState<NoteColor>('mint')
  const [shape, setShape] = useState<NoteShape>('square')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Custom note"
      size="lg"
      busy={pinning}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pinning}>
            Cancel
          </Button>
          <Button size="sm" loading={pinning} onClick={() => onPin(color, shape)}>
            <Plus size={14} /> Pin it
          </Button>
        </div>
      }
    >
      <div className="px-5 py-4 flex flex-col gap-5">
        <fieldset>
          <legend className="font-mono text-label uppercase tracking-wider text-text-4 mb-2">
            Colour
          </legend>
          <div className="flex flex-wrap gap-2">
            {NOTE_COLORS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setColor(value)}
                aria-pressed={color === value}
                title={COLOR_LABEL[value]}
                className={cn(
                  'size-9 rounded-full transition-shadow',
                  COLOR_CLASS[value],
                  color === value
                    ? 'shadow-[0_0_0_2px_var(--color-bg-canvas),0_0_0_4px_var(--color-brand-red)]'
                    : 'shadow-[0_0_0_1px_var(--color-border-default)] hover:shadow-[0_0_0_2px_var(--color-border-strong)]',
                )}
              >
                <span className="sr-only">{COLOR_LABEL[value]}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-mono text-label uppercase tracking-wider text-text-4 mb-2">
            Shape
          </legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {NOTE_SHAPES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setShape(value)}
                aria-pressed={shape === value}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md border p-2 transition-colors',
                  shape === value
                    ? 'border-brand-red bg-brand-red/10'
                    : 'border-border-subtle hover:border-border-strong hover:bg-surface-2',
                )}
              >
                <span className="relative block w-full aspect-square">
                  <span
                    className={cn('absolute inset-0 block', COLOR_CLASS[color])}
                    style={SHAPE_STYLE[value]}
                  />
                </span>
                <span className="font-ui text-caption text-text-2">{SHAPE_LABEL[value]}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  )
}

interface NoteCardProps {
  note: StickyNote
  /** Board scale, needed to convert pointer travel into board units. */
  zoom: number
  /** `onSettled` fires once the save has resolved, successfully or not. */
  onMove: (id: string, posX: number, posY: number, onSettled: () => void) => void
  onChangeContent: (id: string, content: string, onSettled: () => void) => void
  onDelete: (id: string) => void
}

/**
 * How long typing pauses before the note is saved.
 *
 * The note used to save on every keystroke. That is a mutation per character,
 * and every one of them raced the caret.
 */
const TYPING_SAVE_DEBOUNCE_MS = 600

function NoteCard({ note, zoom, onMove, onChangeContent, onDelete }: NoteCardProps) {
  const [editing, setEditing] = useState(false)
  /**
   * Where this note is drawn, when that differs from the saved row.
   *
   * It has to outlive the drag itself. The save is optimistic, but TanStack
   * awaits `cancelQueries` before writing the cache, so the new position lands a
   * tick after the pointer comes up — and dropping the local position on
   * pointerup meant one frame rendered from the stale row. That frame was the
   * flick back to the old spot.
   */
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  /**
   * The text being written, owned locally rather than by the query cache.
   *
   * A textarea driven straight from the cache cannot hold a caret. Each
   * keystroke fired a save, the optimistic write landed a tick later, and in
   * between React re-rendered with the previous string — so the value prop went
   * new, old, new. Re-applying a value a controlled input has already moved past
   * puts the caret at the end, which is why fixing a typo mid-note threw you to
   * the bottom of the paragraph.
   *
   * Non-null from the moment editing starts until the save settles, so the
   * paper keeps showing what was typed while the write is in flight — and so an
   * incoming realtime update cannot overwrite text mid-sentence.
   */
  const [draft, setDraft] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Latest text not yet handed to the server; null once there is nothing owed. */
  const unsaved = useRef<string | null>(null)

  /**
   * Tracked as a ref as well as state because the save callback below fires
   * asynchronously and would otherwise close over whatever `editing` was when
   * the save started.
   */
  const editingRef = useRef(false)

  const flushContent = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = null
    const text = unsaved.current
    if (text === null) return
    unsaved.current = null
    onChangeContent(note.id, text, () => {
      // Handing back to the row mid-sentence would drop everything typed since
      // this save began and throw the caret to the end again, so the draft is
      // only retired once the writing has stopped and nothing is still owed.
      if (!editingRef.current && unsaved.current === null) setDraft(null)
    })
  }, [note.id, onChangeContent])

  // A note unmounted mid-sentence — page left, note deleted elsewhere — must not
  // silently drop the last few characters the timer was still holding.
  useEffect(() => () => flushContent(), [flushContent])
  const originRef = useRef({ pointerX: 0, pointerY: 0, posX: 0, posY: 0 })

  const shape = (note.shape as NoteShape) ?? 'square'
  const color = (note.color as NoteColor) ?? 'pink'

  const x = drag?.x ?? note.pos_x
  const y = drag?.y ?? note.pos_y

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing || e.button !== 0) return
    // Keep the board from panning underneath a note being dragged.
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    originRef.current = { pointerX: e.clientX, pointerY: e.clientY, posX: note.pos_x, posY: note.pos_y }
    setDrag({ x: note.pos_x, y: note.pos_y })
    setDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const o = originRef.current
    // Pointer travel is in screen pixels; the board is scaled, so divide through
    // or the note drifts away from the cursor at any zoom other than 100%.
    setDrag({
      x: Math.round(Math.min(BOARD_W - NOTE_SIZE, Math.max(0, o.posX + (e.clientX - o.pointerX) / zoom))),
      y: Math.round(
        Math.min(BOARD_H - NOTE_SIZE, Math.max(PIN_HEADROOM, o.posY + (e.clientY - o.pointerY) / zoom)),
      ),
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setDragging(false)
    if (!drag) return
    if (drag.x === note.pos_x && drag.y === note.pos_y) {
      setDrag(null)
      return
    }
    // The local position is held until the save settles, then handed back to the
    // row — which by then holds either the new position or, if the save failed,
    // the rolled-back one, so a lost move visibly returns to where it really is.
    onMove(note.id, drag.x, drag.y, () => setDrag(null))
  }

  const anchor = PIN_ANCHOR[shape]

  return (
    /* `isolate` keeps the pin's z-20 inside this note's own stacking context.
       Without it the pin escapes to the board's context and paints over every
       other note, so a pin stayed visible even when its sheet was buried. Notes
       then stack purely by DOM order, and a covered pin is covered with it. */
    <div
      className="absolute group isolate"
      style={{
        left: x,
        top: y,
        width: NOTE_SIZE,
        height: NOTE_SIZE,
        // A sheet you have hold of rides over the rest of the board.
        zIndex: dragging ? 1 : undefined,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          // Pivot about the pin, the way a real sheet hangs from one point —
          // this is what keeps the pin and its hole together as the note tilts.
          // The angle is fixed: a pinned note does not straighten when touched.
          transform: `rotate(${note.rotation}deg)`,
          transformOrigin: `${anchor.x}% ${anchor.y}%`,
        }}
      >
        {/*
          Three layers, and the nesting matters.

          `box-shadow` paints outside the border box, which `clip-path` then cuts
          away — so twelve of the fourteen shapes showed no shadow at all.
          `drop-shadow` instead follows the real alpha silhouette, clipped edges
          included.

          It cannot sit on the same element as the clip: an element's clip-path
          is applied AFTER its own filter, which would cut the shadow off again.
          So the filter goes on the wrapper and the clip on the child inside it.
          Text lives outside the wrapper, or the filter would blur that too.
        */}
        <div
          className="absolute inset-0 transition-[filter] duration-150"
          style={{
            // Contact shadow + ambient spread; lifted while dragging.
            filter: dragging
              ? 'drop-shadow(0 2px 2px rgba(0,0,0,0.22)) drop-shadow(0 14px 20px rgba(0,0,0,0.38))'
              : 'drop-shadow(0 1px 1px rgba(0,0,0,0.20)) drop-shadow(0 5px 9px rgba(0,0,0,0.30))',
          }}
        >
          {/* The paper itself. Carries the handlers so that hit-testing follows
              the silhouette — clicking a star's empty corner misses it. */}
          <div
            role="group"
            aria-label="Sticky note"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={() => {
              setDraft(note.content)
              editingRef.current = true
              setEditing(true)
            }}
            className={cn(
              'absolute inset-0 select-none',
              COLOR_CLASS[color],
              dragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
            style={SHAPE_STYLE[shape]}
          />
        </div>

        {/* Puncture: sits on the paper and tilts with it, so the pin reads as
            going through the sheet rather than resting on top of it. */}
        <span
          className="absolute size-2 rounded-full pointer-events-none"
          style={{
            left: `${anchor.x}%`,
            top: `${anchor.y}%`,
            transform: 'translate(-50%, -50%)',
            // Whatever is behind the paper showing through, not a dark pit: the
            // notes are now darker than the board, so the hole reads as board
            // colour rather than as depth. Taken from the cork token so it stays
            // right if the board is ever retinted.
            background: [
              'radial-gradient(circle,',
              'color-mix(in srgb, var(--color-cork) 55%, transparent) 0%,',
              'color-mix(in srgb, var(--color-cork) 26%, transparent) 55%,',
              'transparent 75%)',
            ].join(' '),
          }}
        />
        {editing ? (
          <textarea
            autoFocus
            value={draft ?? note.content}
            onChange={(e) => {
              // Local first, always — the caret belongs to this element, not to
              // whatever the server last acknowledged.
              setDraft(e.target.value)
              unsaved.current = e.target.value
              if (saveTimer.current) clearTimeout(saveTimer.current)
              saveTimer.current = setTimeout(flushContent, TYPING_SAVE_DEBOUNCE_MS)
            }}
            onBlur={() => {
              editingRef.current = false
              setEditing(false)
              flushContent()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="write something…"
            className="absolute resize-none bg-transparent outline-none font-hand text-note text-note-ink placeholder:text-note-ink/55"
            style={TEXT_INSET[shape]}
          />
        ) : (
          /* Transparent to the pointer so a drag or double-click started on the
             writing lands on the paper underneath. */
          <p
            className="absolute overflow-hidden whitespace-pre-wrap wrap-break-word font-hand text-note text-note-ink pointer-events-none"
            style={TEXT_INSET[shape]}
          >
            {(draft ?? note.content) || (
              <span className="text-note-ink/55">double-click to write…</span>
            )}
          </p>
        )}
      </div>

      <button
        type="button"
        aria-label="Remove note"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onDelete(note.id)}
        className={cn(
          'absolute -right-1 top-2 z-30 size-7 rounded-full bg-surface-1 border border-border-default',
          'flex items-center justify-center text-text-3 hover:text-brand-red',
          'opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity',
        )}
      >
        <Trash2 size={13} />
      </button>

      {/* Drawn last so it lies over the paper, and positioned so the needle tip
          lands exactly on the anchor. It does not rotate with the note — a real
          pin goes into the wall at its own angle whatever the paper does. */}
      <div
        className="absolute z-20 pointer-events-none"
        style={{
          left: `${anchor.x}%`,
          top: `${anchor.y}%`,
          transform: `translate(${-PIN_TIP_X}px, ${-PIN_TIP_Y}px)`,
        }}
      >
        <Pushpin />
      </div>
    </div>
  )
}

export default function StickyNotesPage() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const { data: notes = [], isLoading } = useStickyNotes()
  const { mutate: createNote, isPending: creating } = useCreateStickyNote()
  const { mutate: updateNote } = useUpdateStickyNote()
  const { mutate: deleteNote } = useDeleteStickyNote()
  useRealtimeStickyNotes()

  /** The split button as a whole — the menu aligns to this, not to the caret. */
  const pinGroupRef = useRef<HTMLDivElement>(null)
  const [pinMenuOpen, setPinMenuOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)
  /**
   * Pan and zoom are one piece of state, not two. Zooming about a point has to
   * change both together, and updating one from inside the other's updater
   * breaks under StrictMode, which invokes updaters twice — the pan would be
   * applied double on every zoom.
   */
  const [view, setView] = useState<View>({ zoom: DEFAULT_ZOOM, x: 0, y: 0 })
  const { zoom } = view
  const [panning, setPanning] = useState(false)
  const panOrigin = useRef({ pointerX: 0, pointerY: 0, panX: 0, panY: 0 })

  /**
   * Viewport size lives in a ref so the pointer/wheel handlers can clamp against
   * it without being rebuilt on every resize, and in state so the zoom-out button
   * knows when it has bottomed out.
   */
  const sizeRef = useRef({ w: 0, h: 0 })
  const [size, setSize] = useState({ w: 0, h: 0 })
  const minZoom = useMemo(() => minZoomFor(size.w, size.h), [size])

  useEffect(() => {
    const el = viewportRef.current
    // The viewport is not mounted while the notes are loading, so this has to
    // re-run once they arrive — otherwise nothing is ever measured and every
    // clamp below silently works against a zero-sized frame.
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      sizeRef.current = { w: width, h: height }
      setSize({ w: width, h: height })
      // Re-clamp: a window that just got wider can expose board edges.
      setView((v) => clampView(v, width, height))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [isLoading])

  /** Open in the middle of the cork, once the frame has actually been measured. */
  const centredRef = useRef(false)
  useEffect(() => {
    if (centredRef.current || isLoading || !size.w || !size.h) return
    centredRef.current = true
    setView(viewCentredOn(BOARD_CENTRE, DEFAULT_ZOOM, size.w, size.h))
  }, [isLoading, size])

  /**
   * Zoom about a fixed point so the board grows out of the cursor, not the corner.
   *
   * Expressed as a multiplier rather than a target zoom so the current level is
   * read inside the updater. That keeps the handlers below free of any `zoom`
   * dependency, so they attach once instead of being torn down and rebuilt on
   * every frame of a pinch.
   */
  const zoomBy = useCallback((factor: number, anchorX: number, anchorY: number) => {
    setView((v) => {
      const { w, h } = sizeRef.current
      const target = clampView({ ...v, zoom: v.zoom * factor }, w, h)
      if (target.zoom === v.zoom) return v
      return clampView(
        {
          zoom: target.zoom,
          x: anchorX - ((anchorX - v.x) / v.zoom) * target.zoom,
          y: anchorY - ((anchorY - v.y) / v.zoom) * target.zoom,
        },
        w,
        h,
      )
    })
  }, [])

  /**
   * Wheel handling is attached natively because React's synthetic wheel listener
   * is passive — preventDefault there is ignored and the page scrolls instead of
   * the board zooming.
   *
   * One handler covers three devices, because browsers report all of them as
   * wheel events:
   *
   *  - Trackpad pinch (macOS and Windows precision touchpads alike) arrives as a
   *    wheel event with ctrlKey synthesised by the browser. There is no separate
   *    pinch event to listen for.
   *  - Two-finger trackpad scroll arrives as deltaX/deltaY and pans, matching
   *    Figma and every map on the web.
   *  - A mouse wheel has no horizontal axis and no pinch, so Ctrl/Cmd + wheel is
   *    the zoom, and the on-screen buttons are there for anyone who misses that.
   *
   * deltaMode has to be normalised or the same gesture moves wildly different
   * distances per browser: Firefox reports scroll in lines, not pixels, and some
   * mice report whole pages.
   */
  useEffect(() => {
    const el = viewportRef.current
    // Same reason as the ResizeObserver: the viewport does not exist while the
    // notes are loading, so this must re-run once it does.
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      // DOM_DELTA_LINE (1) and DOM_DELTA_PAGE (2) are not pixels.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1
      const dx = e.deltaX * unit
      const dy = e.deltaY * unit

      if (e.ctrlKey || e.metaKey) {
        // Exponential so each notch is a constant ratio: zooming out then back in
        // by the same amount returns you to exactly where you started.
        const step = Math.max(-ZOOM_WHEEL_MAX_DELTA, Math.min(ZOOM_WHEEL_MAX_DELTA, dy))
        zoomBy(
          Math.exp(-step * ZOOM_WHEEL_SENSITIVITY),
          e.clientX - rect.left,
          e.clientY - rect.top,
        )
      } else {
        // Shift+wheel is the long-standing convention for horizontal scroll on a
        // mouse, which otherwise has no way to pan sideways.
        const [panX, panY] = e.shiftKey && dx === 0 ? [dy, 0] : [dx, dy]
        setView((v) => clampView({ ...v, x: v.x - panX, y: v.y - panY }, rect.width, rect.height))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomBy, isLoading])

  /**
   * Stop the browser zooming the page itself while the board is open.
   *
   * The board's own handler only sees events that land on the board. A pinch
   * that starts a few pixels outside it — on the header, the padding, the page
   * behind — is an ordinary browser zoom, and since a trackpad pinch is
   * reported at the cursor, a fast gesture that drifts off the board zooms the
   * whole screen mid-motion. That is the jarring behaviour: not a bug in the
   * board, but the page underneath responding to the same gesture.
   *
   * So Ctrl/Cmd + wheel is swallowed page-wide for as long as this page is
   * mounted. Capture phase, so it runs before anything else; no stopPropagation,
   * so the board's own handler still zooms the board when the cursor is over it.
   *
   * Safari is the exception that needs separate work: it reports a trackpad
   * pinch as non-standard gesture events rather than ctrl+wheel, so without
   * these it would keep zooming the page. `scale` is read through a type guard
   * because these events have no TypeScript definitions.
   */
  useEffect(() => {
    const blockPageZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    }
    document.addEventListener('wheel', blockPageZoom, { passive: false, capture: true })

    let lastScale = 1
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      lastScale = 1
    }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      if (!('scale' in e) || typeof e.scale !== 'number' || !e.scale) return
      const factor = e.scale / lastScale
      lastScale = e.scale

      const rect = viewportRef.current?.getBoundingClientRect()
      if (!rect) return
      if (!('clientX' in e) || typeof e.clientX !== 'number') return
      if (!('clientY' in e) || typeof e.clientY !== 'number') return
      const [x, y] = [e.clientX - rect.left, e.clientY - rect.top]
      // Swallowed everywhere, but only the board zooms — a pinch over the
      // sidebar should do nothing rather than move the canvas.
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
      zoomBy(factor, x, y)
    }
    document.addEventListener('gesturestart', onGestureStart, { passive: false })
    document.addEventListener('gesturechange', onGestureChange, { passive: false })
    document.addEventListener('gestureend', onGestureStart, { passive: false })

    return () => {
      document.removeEventListener('wheel', blockPageZoom, { capture: true })
      document.removeEventListener('gesturestart', onGestureStart)
      document.removeEventListener('gesturechange', onGestureChange)
      document.removeEventListener('gestureend', onGestureStart)
    }
  }, [zoomBy])

  const zoomByStep = (factor: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    zoomBy(factor, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2)
  }

  const resetView = () =>
    setView(viewCentredOn(BOARD_CENTRE, DEFAULT_ZOOM, sizeRef.current.w, sizeRef.current.h))

  /**
   * Touch pinch is tracked by hand.
   *
   * A trackpad pinch is delivered as a ctrl+wheel event, but a touchscreen pinch
   * is not — it is two independent pointers, and the browser gives us nothing
   * higher-level than that (`touch-none` is what stops it becoming a page zoom).
   * So every live pointer is recorded, and the moment there are two the gesture
   * switches from pan to pinch.
   */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ dist: number; view: View; mid: { x: number; y: number } } | null>(null)

  /** Pointer positions relative to the frame, which is what the view maths uses. */
  const localPoint = (e: { clientX: number; clientY: number }) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) }
  }

  const beginPinch = () => {
    const [a, b] = [...pointersRef.current.values()]
    if (!a || !b) return
    setPanning(false)
    pinchRef.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      view,
    }
  }

  // Drag anywhere on the cork (or middle-click anywhere) to pan.
  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, localPoint(e))

    if (pointersRef.current.size >= 2) {
      beginPinch()
      return
    }
    panOrigin.current = { pointerX: e.clientX, pointerY: e.clientY, panX: view.x, panY: view.y }
    setPanning(true)
  }

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, localPoint(e))

    const pinch = pinchRef.current
    if (pinch && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (!pinch.dist) return
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const { w, h } = sizeRef.current
      const zoomed = clampView({ ...pinch.view, zoom: pinch.view.zoom * (dist / pinch.dist) }, w, h)
      // Keep the board point that started under the fingers under them still, so
      // the pinch zooms and drags in one motion the way a photo viewer does.
      const anchor = {
        x: (pinch.mid.x - pinch.view.x) / pinch.view.zoom,
        y: (pinch.mid.y - pinch.view.y) / pinch.view.zoom,
      }
      setView(
        clampView(
          { zoom: zoomed.zoom, x: mid.x - anchor.x * zoomed.zoom, y: mid.y - anchor.y * zoomed.zoom },
          w,
          h,
        ),
      )
      return
    }

    if (!panning) return
    const o = panOrigin.current
    setView((v) =>
      clampView(
        { ...v, x: o.panX + (e.clientX - o.pointerX), y: o.panY + (e.clientY - o.pointerY) },
        sizeRef.current.w,
        sizeRef.current.h,
      ),
    )
  }

  const handleBoardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }

    if (pointersRef.current.size < 2) pinchRef.current = null
    // Lifting one finger of a pinch should hand back to a one-finger pan rather
    // than freezing the board until you let go of both.
    const [rest] = [...pointersRef.current.entries()]
    if (rest) {
      const rect = viewportRef.current?.getBoundingClientRect()
      panOrigin.current = {
        pointerX: rest[1].x + (rect?.left ?? 0),
        pointerY: rest[1].y + (rect?.top ?? 0),
        panX: view.x,
        panY: view.y,
      }
      setPanning(true)
      return
    }
    setPanning(false)
  }

  /** Drop new notes into the middle of what is currently on screen. */
  const viewCentre = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const w = rect?.width ?? 800
    const h = rect?.height ?? 600
    return {
      x: Math.round((w / 2 - view.x) / view.zoom - NOTE_SIZE / 2),
      y: Math.round((h / 2 - view.y) / view.zoom - NOTE_SIZE / 2),
    }
  }, [view])

  /** Colour and shape are picked at random unless the custom dialog supplied them. */
  const handleAdd = (color?: NoteColor, shape?: NoteShape) => {
    if (!profile) return
    const centre = viewCentre()
    // Scatter around the centre so a run of new notes never stacks exactly.
    const jitter = () => Math.round((Math.random() - 0.5) * 160)
    createNote(
      {
        profileId: profile.id,
        color: color ?? randomOf(NOTE_COLORS),
        shape: shape ?? randomOf(NOTE_SHAPES),
        rotation: Math.round(Math.random() * 16) - 8,
        posX: Math.min(BOARD_W - NOTE_SIZE, Math.max(0, centre.x + jitter())),
        posY: Math.min(BOARD_H - NOTE_SIZE, Math.max(PIN_HEADROOM, centre.y + jitter())),
      },
      { onError: () => toast('Could not pin that note', 'error') },
    )
  }

  const handlePinCustom = (color: NoteColor, shape: NoteShape) => {
    handleAdd(color, shape)
    setCustomOpen(false)
  }

  const handleMove = useCallback(
    (id: string, posX: number, posY: number, onSettled: () => void) =>
      updateNote({ id, posX, posY }, { onSettled }),
    [updateNote],
  )
  const handleContent = useCallback(
    (id: string, content: string, onSettled: () => void) =>
      updateNote({ id, content }, { onSettled }),
    [updateNote],
  )
  const handleDelete = useCallback((id: string) => deleteNote(id), [deleteNote])

  const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom])

  return (
    <>
      {/* Gradients are declared once for the page; every pin references them by id. */}
      <PushpinDefs />
      <Topbar title="My Notes" />
      <div className="px-8 py-7 max-w-content mx-auto w-full">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="font-display font-bold text-h3 text-text-1 flex items-center gap-2">
              <Sparkles size={18} className="text-brand-red" />
              My Notes
            </h1>
            <p className="font-ui text-body-sm text-text-3 mt-1">
              Drag a note to move it, double-click to write. Drag the board to pan, ⌘/Ctrl + scroll to zoom.
            </p>
          </div>
          {/* Split button: the face pins a random note, the caret opens the
              deliberate route. Sharing an edge is what says they belong to the
              same action rather than being two unrelated buttons. */}
          <div ref={pinGroupRef} className="flex items-stretch shrink-0">
            <Button
              size="sm"
              onClick={() => {
                setPinMenuOpen(false)
                handleAdd()
              }}
              loading={creating}
              className="rounded-r-none"
            >
              <Plus size={14} /> Pin a note
            </Button>
            <button
              type="button"
              aria-label="More pinning options"
              aria-haspopup="menu"
              aria-expanded={pinMenuOpen}
              onClick={() => setPinMenuOpen((o) => !o)}
              className={cn(
                'flex items-center justify-center w-7 rounded-sm rounded-l-none',
                'bg-brand-red text-white hover:bg-brand-red-hover active:bg-brand-red-press',
                'border-l border-white/25 focus:outline-none focus:shadow-ring-focus',
              )}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/*
          Anchored to the whole split button, not the caret, so the menu lines up
          under the control rather than under the 28px arrow at its edge.

          Popover only positions — it deliberately ships no surface of its own —
          so the panel chrome is supplied here, matching the other menus in the app.
        */}
        <Popover
          anchorRef={pinGroupRef}
          open={pinMenuOpen}
          onClose={() => setPinMenuOpen(false)}
          matchAnchorWidth
        >
          {/* matchAnchorWidth takes the width from the split button, and h-8 with
              no panel padding matches its height, so the item is the same size as
              the control it drops out of. */}
          <div className="w-full overflow-hidden rounded-sm border border-border-strong bg-surface-2 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setPinMenuOpen(false)
                setCustomOpen(true)
              }}
              className="flex h-8 w-full items-center gap-2 px-3 font-ui text-body-sm text-text-1 hover:bg-surface-3"
            >
              <Sparkles size={14} className="text-text-3" /> Custom note…
            </button>
          </div>
        </Popover>

        <CustomNoteDialog
          open={customOpen}
          onClose={() => setCustomOpen(false)}
          onPin={handlePinCustom}
          pinning={creating}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-text-4">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : (
          <div className="relative">
            <div
              ref={viewportRef}
              onPointerDown={handleBoardPointerDown}
              onPointerMove={handleBoardPointerMove}
              onPointerUp={handleBoardPointerUp}
              // A touch can be cancelled (system gesture, call, palm rejection)
              // without ever reporting pointerup, which would strand the gesture.
              onPointerCancel={handleBoardPointerUp}
              className={cn(
                // No frame, and no inner vignette — a black shadow on a black
                // board is invisible, so it was only costing a paint.
                'relative overflow-hidden rounded-lg',
                'bg-cork',
                'touch-none',
                panning ? 'cursor-grabbing' : 'cursor-grab',
              )}
              style={{ height: 'min(70vh, 720px)' }}
            >
              <div
                className="absolute left-0 top-0 origin-top-left bg-cork"
                style={{
                  width: BOARD_W,
                  height: BOARD_H,
                  transform: `translate(${view.x}px, ${view.y}px) scale(${zoom})`,
                  /*
                   * Cork speckle. Three dot layers at co-prime tile sizes, each
                   * offset to a different spot inside its tile — the layers only
                   * realign every 31×43×57px, so the eye reads scatter rather
                   * than a grid. `circle` is explicit because the default shape
                   * is an ellipse, which was what made the old pattern look
                   * regular and smeared.
                   */
                  backgroundImage: [
                    'radial-gradient(circle at 24% 38%, var(--color-cork-dark) 0 1.3px, transparent 1.4px)',
                    'radial-gradient(circle at 71% 22%, var(--color-cork-speck) 0 1.6px, transparent 1.7px)',
                    'radial-gradient(circle at 48% 79%, var(--color-cork-dark) 0 1px, transparent 1.1px)',
                  ].join(','),
                  backgroundSize: '31px 31px, 43px 43px, 57px 57px',
                }}
              >
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    zoom={zoom}
                    onMove={handleMove}
                    onChangeContent={handleContent}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              {notes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 pointer-events-none">
                  <p className="font-display font-bold text-h4 text-text-2">Your board is empty</p>
                  <p className="font-ui text-body-sm text-text-4 max-w-80">
                    Pin your first note and it will show up here, exactly where you leave it.
                  </p>
                </div>
              )}

              {/* Zoom controls, floating over the board like a canvas tool. */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-border-default bg-surface-1/95 px-1.5 py-1 shadow-lg">
                <button
                  type="button"
                  aria-label="Zoom out"
                  disabled={zoom <= minZoom + 0.001}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => zoomByStep(1 / ZOOM_STEP)}
                  className="size-7 rounded-full flex items-center justify-center text-text-2 hover:bg-surface-2 disabled:opacity-40"
                >
                  <Minus size={14} />
                </button>
                <span className="font-mono text-caption text-text-3 w-11 text-center tabular-nums">
                  {zoomPercent}%
                </span>
                <button
                  type="button"
                  aria-label="Zoom in"
                  disabled={zoom >= MAX_ZOOM}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => zoomByStep(ZOOM_STEP)}
                  className="size-7 rounded-full flex items-center justify-center text-text-2 hover:bg-surface-2 disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
                <span className="mx-0.5 h-4 w-px bg-border-default" />
                <button
                  type="button"
                  aria-label="Reset view"
                  title="Reset view"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={resetView}
                  className="size-7 rounded-full flex items-center justify-center text-text-2 hover:bg-surface-2"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
