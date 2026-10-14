import { useCallback, useEffect, useRef, type MouseEvent } from 'react'
import { isPlayerSurface } from './player-input'

const SINGLE_CLICK_DELAY = 250

/** Delay a mouse single click so a double click can switch fullscreen without pausing. */
export function usePlayerClicks(onSingleClick: () => void, onDoubleClick: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstClickAt = useRef(0)
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)

    timer.current = null
  }, [])

  useEffect(() => cancel, [cancel])

  return {
    onClick(event: MouseEvent<HTMLDivElement>) {
      if (!isPlayerSurface(event.target, event.currentTarget)) return

      // Programmatic/accessibility activation has no mouse click sequence.
      if (event.detail === 0) {
        cancel()
        onSingleClick()

        return
      }

      const now = performance.now()

      if (timer.current !== null) {
        const double = now - firstClickAt.current <= SINGLE_CLICK_DELAY

        cancel()
        if (double) {
          onDoubleClick()

          return
        }

        onSingleClick()
      }

      firstClickAt.current = now
      timer.current = setTimeout(() => {
        timer.current = null
        onSingleClick()
      }, SINGLE_CLICK_DELAY)
    },
    onDoubleClick(event: MouseEvent<HTMLDivElement>) {
      if (!isPlayerSurface(event.target, event.currentTarget)) return

      // Clicks are classified above using our shorter interval, not the OS setting.
      event.preventDefault()
    },
  }
}
