import { useServices } from '@/services/services'
import { Pressable } from '@/shared/ui/focus'
import { IconBack } from '@/shared/ui/icons'
import styles from './back-button.module.css'

export function BackButton({ focusKey }: { focusKey: string }) {
  const { remote } = useServices()

  return (
    <Pressable focusKey={focusKey} className={styles.back} onPress={remote.back} role="button" aria-label="Назад">
      <IconBack />
    </Pressable>
  )
}
