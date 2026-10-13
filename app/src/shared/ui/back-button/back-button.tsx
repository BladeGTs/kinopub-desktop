import { useServices } from '@/services/services'
import { Button } from '@/shared/ui/button'
import { IconBack } from '@/shared/ui/icons'
import styles from './back-button.module.css'

export function BackButton({ focusKey }: { focusKey: string }) {
  const { remote } = useServices()

  return (
    <Button focusKey={focusKey} className={styles.back} size="sm" icon={<IconBack />} onPress={remote.back} aria-label="Назад">
      Назад
    </Button>
  )
}
