import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getCurrentFocusKey, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useServices } from '@/services/services'
import { IconSound } from '@/shared/ui/icons'
import { cx } from '@/shared/lib/cx'
import styles from './player-volume.module.css'
import type { usePlayerVolume } from './use-player-volume'

export function PlayerVolume({
  controller,
  focusKey,
  active,
}: {
  controller: Omit<ReturnType<typeof usePlayerVolume>, 'attach'>
  focusKey: string
  active: boolean
}) {
  const { remote, ui } = useServices()
  const root = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const silent = controller.muted || controller.volume === 0
  const percent = Math.round((silent ? 0 : controller.volume) * 100)
  const { ref, focused, focusSelf } = useFocusable<object, HTMLDivElement>({
    focusKey,
    onEnterPress: controller.toggleMute,
  })
  const open = active && (hovered || (!ui.pointer && focused))
  const state = useRef({ controller, active, hovered })

  useLayoutEffect(() => {
    state.current = { controller, active, hovered }
  }, [controller, active, hovered])
  useEffect(
    () =>
      remote.push((event) => {
        const latest = state.current
        const ownsFocus = getCurrentFocusKey() === focusKey || root.current?.contains(document.activeElement)

        if (!latest.active || (!latest.hovered && !ownsFocus) || event.altKey || event.ctrlKey || event.metaKey) return false

        const up = event.key === 'ArrowUp' || event.keyCode === 38
        const down = event.key === 'ArrowDown' || event.keyCode === 40

        if (!up && !down) return false

        const base = latest.controller.muted ? 0 : latest.controller.volume

        latest.controller.setVolume(Math.round((base + (up ? 0.05 : -0.05)) * 100) / 100)

        return true
      }),
    [remote, focusKey],
  )

  return (
    <div
      ref={root}
      data-player-volume
      className={styles.volume}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={ref}
        role="button"
        aria-label={silent ? 'Включить звук' : 'Выключить звук'}
        className={cx(styles.button, focused && (!ui.pointer || hovered) && 'is-focused', silent && styles.muted)}
        onMouseMove={() => {
          if (ui.pointer && !focused) focusSelf()
        }}
        onClick={() => {
          focusSelf()
          controller.toggleMute()
        }}
      >
        <IconSound />
      </div>
      <div className={cx(styles.popup, open && styles.open)} aria-hidden={!open}>
        <div className={styles.sliderBody}>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={percent}
            tabIndex={-1}
            aria-label="Громкость"
            aria-orientation="vertical"
            onInput={(event) => controller.setVolume(Number(event.currentTarget.value) / 100)}
          />
          <output>{percent}%</output>
        </div>
      </div>
    </div>
  )
}
