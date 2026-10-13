import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useServices } from '@/services/services'
import { FocusGroup, Pressable } from '@/shared/ui/focus'
import { ListItem } from '@/shared/ui/list'
import type { Option } from '../settings-screen.view-model'
import styles from './setting.module.css'
import { dismissOutside } from '@/shared/lib/dismiss-outside'

interface SettingSelectProps<T extends string> {
  name: string
  description?: string
  focusKey: string
  value: T
  options: Option<T>[]
  onSelect: (value: T) => void
}

export function SettingSelect<T extends string>({ name, description, focusKey, value, options, onSelect }: SettingSelectProps<T>) {
  const { remote } = useServices()
  const anchor = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null)
  const selected = options.find((option) => option.id === value)
  const close = useCallback(() => {
    setPosition(null)
    setFocus(focusKey)
  }, [focusKey])
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )
  const open = () => {
    const rect = anchor.current!.getBoundingClientRect()
    const height = Math.min(options.length * 88 + 24, 440, window.innerHeight - 32)
    const top = rect.bottom + height + 8 <= window.innerHeight ? rect.bottom + 8 : Math.max(16, rect.top - height - 8)

    setPosition({ left: rect.left, top, width: rect.width, maxHeight: height })
  }

  useEffect(() => {
    if (!position) return

    const unsubscribe = remote.pushBack(() => {
      close()

      return true
    })
    const frame = requestAnimationFrame(() => setFocus(`${focusKey}-option-${activeIndex}`))
    const resize = () => close()

    window.addEventListener('resize', resize)

    return () => {
      unsubscribe()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [position, remote, focusKey, activeIndex, close])

  return (
    <>
      <div ref={anchor}>
        <ListItem
          name={name}
          description={description}
          focusKey={focusKey}
          onPress={open}
          aria-label={name}
          aria-haspopup="listbox"
          aria-expanded={!!position}
          value={
            <>
              {selected?.title ?? '—'}
              <span className={styles.arrow}>▾</span>
            </>
          }
        />
      </div>
      {position &&
        createPortal(
          <div
            className={styles.overlay}
            onWheel={(event) => event.stopPropagation()}
            onMouseDown={(event) => dismissOutside(event, close)}
          >
            <div role="listbox" aria-label={name} className={styles.options} style={position}>
              <FocusGroup focusKey={`${focusKey}-options`} isFocusBoundary>
                {options.map((option, index) => (
                  <Pressable
                    key={option.id}
                    focusKey={`${focusKey}-option-${index}`}
                    className={styles.option}
                    role="option"
                    aria-selected={option.id === value}
                    onFocus={({ node }) => node?.scrollIntoView({ block: 'nearest' })}
                    onPress={() => {
                      onSelect(option.id)
                      close()
                    }}
                  >
                    <span>
                      {option.title}
                      {option.description && <small>{option.description}</small>}
                    </span>
                    {option.id === value && <span>✓</span>}
                  </Pressable>
                ))}
              </FocusGroup>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
