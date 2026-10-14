import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { useServices } from '@/services/services'
import { Button } from '@/shared/ui/button'
import { FocusGroup, Pressable } from '@/shared/ui/focus'
import { IconRefresh } from '@/shared/ui/icons'
import styles from './pair-screen.module.css'
import { ProxySettings } from '@/features/proxy'

export const PairScreen = observer(function PairScreen() {
  const { auth } = useServices()
  const device = auth.device
  const [copiedCode, setCopiedCode] = useState('')
  const [copyError, setCopyError] = useState('')
  let url = 'https://kino.pub/device'

  try {
    const candidate = new URL(device?.verification_uri ?? url)

    if (candidate.protocol === 'https:' && !candidate.username && !candidate.password) url = candidate.href
  } catch {
    /* Keep the default device activation URL. */
  }

  const site = url.replace(/^https:\/\//, '')
  const code = device?.user_code
  const copyCode = async () => {
    if (!code) return

    setCopyError('')
    try {
      if (window.desktop?.copyDeviceCode) {
        if (!(await window.desktop.copyDeviceCode(code))) throw new Error('Copy failed')
      } else {
        await navigator.clipboard.writeText(code)
      }

      setCopiedCode(code)
    } catch {
      setCopyError('Не удалось скопировать код. Попробуйте ещё раз.')
    }
  }

  return (
    <FocusGroup focusKey="PAIR" className={styles.pair} preferredChildFocusKey="PAIR-refresh">
      <div>
        <div className={styles.pairLogo}>К</div>
        <h1>Кинопаб</h1>
        <p className={styles.pairLead}>Чтобы начать, привяжите приложение к аккаунту.</p>
        <ol className={styles.pairSteps}>
          <li>
            Откройте на телефоне или компьютере{' '}
            <Pressable
              role="link"
              focusKey="PAIR-site"
              aria-label="Открыть KinoPub в браузере"
              className={styles.pairLink}
              onPress={() => window.open(url, '_blank', 'noopener,noreferrer')}
            >
              {site}
            </Pressable>
          </li>
          <li>Войдите в аккаунт Кинопаба</li>
          <li>Введите код с экрана</li>
        </ol>
        {auth.pairingError && <p className={styles.pairError}>{auth.pairingError}</p>}
        <div className={styles.pairActions}>
          <Button icon={<IconRefresh />} onPress={auth.startPairing} focusKey="PAIR-refresh">
            Запросить новый код
          </Button>
          <ProxySettings variant="button" />
        </div>
      </div>
      <div className={styles.pairRight}>
        <div className={styles.pairCodeLabel}>Код устройства</div>
        {code ? (
          <Pressable
            role="button"
            focusKey="PAIR-copy"
            aria-label="Скопировать код устройства"
            className={styles.pairCode}
            onPress={() => void copyCode()}
          >
            {code}
          </Pressable>
        ) : (
          <div className={styles.pairCode}>· · · · ·</div>
        )}
        <div className={styles.pairCopyHint} aria-live="polite">
          {copyError || (code ? (copiedCode === code ? 'Скопировано' : 'Нажмите на код, чтобы скопировать') : '')}
        </div>
        <div className={styles.pairHint}>Код действует 10 минут. Экран сам сменится после подтверждения.</div>
      </div>
    </FocusGroup>
  )
})
