import type { ReactNode } from 'react'
import { ListItem } from '@/shared/ui/list'
import styles from './setting.module.css'

export interface SettingProps {
  name: string
  description?: string
  value?: ReactNode
  checked?: boolean
  onPress: () => void
  onCycle?: (direction: 1 | -1) => void
  focusKey?: string
}

export function Setting({ name, description, value, checked, onPress, onCycle, focusKey }: SettingProps) {
  return (
    <ListItem
      focusKey={focusKey}
      name={name}
      description={description}
      role={checked === undefined ? undefined : 'switch'}
      aria-checked={checked}
      aria-label={name}
      value={
        checked === undefined ? (
          value
        ) : (
          <span className={styles.toggle} data-checked={checked}>
            <span />
          </span>
        )
      }
      onPress={onPress}
      onArrow={(direction) => {
        if (!onCycle || (direction !== 'left' && direction !== 'right')) return true

        onCycle(direction === 'right' ? 1 : -1)

        return false
      }}
    />
  )
}
