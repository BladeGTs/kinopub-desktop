import { observer } from 'mobx-react-lite'
import { useServices } from '@/services/services'
import { link } from '@/app/routes'
import { BackButton } from './back-button'
import styles from './page-back.module.css'

/** Fixed to the page viewport, independent of hero text and scrolling. */
export const PageBack = observer(function PageBack() {
  const { router } = useServices()

  if (router.pathname === link.home()) return null

  return (
    <div className={styles.back}>
      <BackButton focusKey="APP-back" />
    </div>
  )
})
