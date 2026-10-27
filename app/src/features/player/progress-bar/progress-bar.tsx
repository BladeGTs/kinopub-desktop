import { observer } from 'mobx-react-lite'
import { useState, type MouseEvent } from 'react'
import { formatClock } from '@/shared/lib/format'
import { Pressable } from '@/shared/ui/focus'
import type { PlayerScreenViewModel } from '../player-screen.view-model'
import styles from './progress-bar.module.css'

interface ProgressBarProps {
  vm: PlayerScreenViewModel
  focusKey: string
}

/** The only HUD piece that reads `time`, so timeupdate (several times a second) re-renders just this bar, not the whole screen. */
export const ProgressBar = observer(function ProgressBar({ vm, focusKey }: ProgressBarProps) {
  const [hoverFraction, setHoverFraction] = useState<number | null>(null)
  const hoverTime = hoverFraction !== null && Number.isFinite(vm.duration) && vm.duration > 0 ? hoverFraction * vm.duration : null

  return (
    <Pressable focusKey={focusKey} className={styles.progress} onPress={vm.togglePlay} onArrow={vm.onBarArrow}>
      <div
        className={styles.bar}
        onMouseEnter={(event) => setHoverFraction(fractionAt(event))}
        onMouseMove={(event) => setHoverFraction(fractionAt(event))}
        onMouseLeave={() => setHoverFraction(null)}
        onClick={(event) => {
          event.stopPropagation()
          const fraction = fractionAt(event)

          if (fraction !== null) vm.seekToFraction(fraction)
        }}
      >
        <div className={styles.barFill} style={{ width: `${vm.progress}%` }} />
        <div className={styles.barKnob} style={{ left: `${vm.progress}%` }}>
          {hoverTime === null && <span className={styles.barTip}>{formatClock(vm.shownTime)}</span>}
        </div>
        {hoverTime !== null && (
          <>
            <div className={styles.hoverMarker} style={{ left: `${hoverFraction! * 100}%` }} />
            <span role="tooltip" className={styles.hoverTime} style={{ left: `clamp(48px, ${hoverFraction! * 100}%, calc(100% - 48px))` }}>
              {formatClock(hoverTime)}
            </span>
          </>
        )}
      </div>
      <span className={styles.remaining}>{formatClock(vm.remaining)}</span>
    </Pressable>
  )
})

function fractionAt(event: MouseEvent<HTMLDivElement>) {
  const rect = event.currentTarget.getBoundingClientRect()

  return rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : null
}
