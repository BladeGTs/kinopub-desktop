import { useCallback, useEffect, useRef, type MouseEvent } from 'react'
import { isPlayerSurface } from './player-input'

// Leave room for the standard desktop double-click interval (500 ms).
const SINGLE_CLICK_DELAY = 600

/** Delay a mouse single click so a double click can switch fullscreen without pausing. */
export function usePlayerClicks(onSingleClick: () => void, onDoubleClick: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)

    timer.current = null
  }, [])

  useEffect(() => cancel, [cancel])

  return {
    onClick(event: MouseEvent<HTMLDivElement>) {
      if (!isPlayerSurface(event.target, event.currentTarget)) return

      cancel()
      if (event.detail >= 2) return
      // Programmatic/accessibility activation has no mouse click sequence.
      if (event.detail === 0) onSingleClick()
      else
        timer.current = setTimeout(() => {
          timer.current = null
          onSingleClick()
        }, SINGLE_CLICK_DELAY)
    },
    onDoubleClick(event: MouseEvent<HTMLDivElement>) {
      if (!isPlayerSurface(event.target, event.currentTarget)) return

      cancel()
      onDoubleClick()
    },
  }
}
