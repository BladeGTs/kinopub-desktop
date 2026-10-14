import type { ReactNode } from 'react'
import styles from './page-title.module.css'
import { PageBack } from '@/shared/ui/back-button'

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <PageBack className={styles.title}>
      <h1 className={styles.text}>{children}</h1>
    </PageBack>
  )
}
