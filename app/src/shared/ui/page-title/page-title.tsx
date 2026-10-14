import type { ReactNode } from 'react'
import styles from './page-title.module.css'

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <div className={styles.title}>
      <h1 className={styles.text}>{children}</h1>
    </div>
  )
}
