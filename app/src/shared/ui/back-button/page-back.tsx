import { observer } from 'mobx-react-lite'
import type { ReactNode } from 'react'
import { useServices } from '@/services/services'
import { link } from '@/app/routes'
import { cx } from '@/shared/lib/cx'
import { BackButton } from './back-button'
import styles from './page-back.module.css'

/** Keep the heading's alignment and place Back in its left gutter. */
export const PageBack = observer(function PageBack({ children, className }: { children: ReactNode; className?: string }) {
  const { router } = useServices()

  return (
    <div className={cx(styles.anchor, className)}>
      {router.pathname !== link.home() && (
        <div className={styles.back}>
          <BackButton focusKey="APP-back" />
        </div>
      )}
      {children}
    </div>
  )
})
