import { makeAutoObservable } from 'mobx'
import { GlideDetector } from '@/shared/ui/motion'

const BOTTOM_PADDING = 60
const WHEEL_LINE_HEIGHT = 16
const WHEEL_IDLE_MS = 150

export class PageViewModel {
  offset: number
  /** True while an arrow is held: scrolling then moves linearly, in step with key repeats. */
  gliding = false
  wheelScrolling = false
  /** Deliberately not observable. */
  initialFocusPlaced = false
  private stack: HTMLElement | null = null
  private readonly glide = new GlideDetector()
  private wheelTimer: number | null = null

  constructor(
    private readonly top: number,
    initialOffset: number,
    readonly viewport: number,
    /** Pin the focused row to the top of the viewport instead of scrolling minimally. */
    private readonly pinned: boolean,
    /** Focus taken by the Magic Remote pointer must not scroll: the next card would slide under the cursor and take focus in turn. */
    private readonly pointer: () => boolean = () => false,
  ) {
    this.offset = initialOffset
    makeAutoObservable<this, 'stack' | 'top' | 'glide' | 'pinned' | 'pointer' | 'wheelTimer'>(
      this,
      {
        stack: false,
        top: false,
        glide: false,
        viewport: false,
        pinned: false,
        pointer: false,
        wheelTimer: false,
        initialFocusPlaced: false,
      },
      { autoBind: true },
    )
  }

  markInitialFocusPlaced() {
    this.initialFocusPlaced = true
  }

  setStack(el: HTMLElement | null) {
    this.stack = el
  }

  offsetOf(el: HTMLElement): number {
    return this.stack ? offsetWithin(el, this.stack) : 0
  }

  reveal(el: HTMLElement | null) {
    if (!el || !this.stack || this.pointer()) return

    this.stopWheelScrolling()
    const elementTop = offsetWithin(el, this.stack)
    const elementBottom = elementTop + el.offsetHeight + BOTTOM_PADDING
    const stackBottom = this.stack.offsetHeight + BOTTOM_PADDING
    let next = this.offset

    // Anything that fits on the first screen scrolls to the very top, so titles and headers above it come back into view.
    if (elementBottom <= this.viewport) next = 0
    else if (this.pinned) next = Math.max(0, elementTop - this.top)
    else if (elementTop - this.top < this.offset) next = Math.max(0, elementTop - this.top)
    else if (elementBottom > this.offset + this.viewport) next = Math.max(0, elementBottom - this.viewport)
    // Near the end of a plain page, show the end: a version line or footer under the last row would otherwise stay cut off.
    if (!this.pinned && next > 0 && stackBottom - elementBottom < this.viewport / 3) next = Math.max(next, stackBottom - this.viewport)
    if (next === this.offset) return

    this.gliding = this.glide.step()
    this.offset = next
  }

  /** Keep the OS's trackpad deltas and momentum; normalize non-pixel mouse wheel units. */
  scrollBy(delta: number, deltaMode = 0) {
    if (!this.stack || !Number.isFinite(delta) || delta === 0) return

    const max = Math.max(0, this.stack.offsetHeight + BOTTOM_PADDING - this.viewport)
    const pixels = delta * (deltaMode === 1 ? WHEEL_LINE_HEIGHT : deltaMode === 2 ? this.viewport : 1)
    const next = Math.max(0, Math.min(max, this.offset + pixels))

    if (next === this.offset) return

    this.gliding = false
    this.wheelScrolling = true
    if (this.wheelTimer !== null) clearTimeout(this.wheelTimer)

    this.wheelTimer = window.setTimeout(this.stopWheelScrolling, WHEEL_IDLE_MS)
    this.offset = next
  }

  private stopWheelScrolling() {
    if (this.wheelTimer !== null) clearTimeout(this.wheelTimer)

    this.wheelTimer = null
    this.wheelScrolling = false
  }

  dispose() {
    this.stopWheelScrolling()
    this.stack = null
  }
}

function offsetWithin(el: HTMLElement, ancestor: HTMLElement): number {
  let offset = 0
  let node: HTMLElement | null = el

  while (node && node !== ancestor) {
    offset += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }

  return offset
}
