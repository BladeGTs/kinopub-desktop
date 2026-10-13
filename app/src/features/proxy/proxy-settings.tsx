import { getCurrentFocusKey, setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useServices } from '@/services/services'
import type { ProxyConfig } from '@/shared/lib/proxy-types'
import { dismissOutside } from '@/shared/lib/dismiss-outside'
import { Button } from '@/shared/ui/button'
import { ListItem } from '@/shared/ui/list'
import styles from './proxy-settings.module.css'

const defaults: ProxyConfig = { mode: 'system', protocol: 'http', host: '', port: 8080, username: '', password: '' }
const labels = { system: 'Системный', direct: 'Без прокси', manual: 'Свой прокси' }

export function ProxySettings({ variant = 'setting' }: { variant?: 'setting' | 'button' }) {
  const { remote } = useServices()
  const [config, setConfig] = useState<ProxyConfig>(defaults)
  const [draft, setDraft] = useState<ProxyConfig>(defaults)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const returnFocus = useRef('')
  const form = useRef<HTMLFormElement>(null)
  const titleId = useId()
  const supported = !!window.desktop?.getProxy && !!window.desktop?.setProxy
  const close = useCallback(() => {
    setOpen(false)
    if (returnFocus.current) setFocus(returnFocus.current)
  }, [])

  useEffect(() => {
    if (!supported) return

    let active = true

    window.desktop!.getProxy!()
      .then((value) => {
        if (active) {
          setConfig(value)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (active) {
          setError('Не удалось загрузить настройки прокси')
          setLoaded(true)
        }
      })

    return () => {
      active = false
    }
  }, [supported])
  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement
    const frame = requestAnimationFrame(() => form.current?.querySelector('select')?.focus())
    const unsubscribe = remote.pushBack(() => {
      close()

      return true
    })

    return () => {
      unsubscribe()
      cancelAnimationFrame(frame)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [open, remote, close])

  if (!supported) return null

  const show = () => {
    if (!loaded) return

    returnFocus.current = getCurrentFocusKey() ?? ''
    setDraft({ ...config, password: '', clearPassword: false })
    setMessage('')
    setOpen(true)
  }

  const change = <K extends keyof ProxyConfig>(key: K, value: ProxyConfig[K]) => setDraft((previous) => ({ ...previous, [key]: value }))
  const save = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await window.desktop!.setProxy!(draft)

      if (!result.ok) {
        setError(result.error)

        return
      }

      setConfig(result.config)
      setDraft({ ...result.config, password: '', clearPassword: false })
      setMessage('Настройки сохранены и применены. Повторите запрос или откройте видео заново.')
    } catch {
      setError('Не удалось применить настройки прокси')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {variant === 'button' ? (
        <Button focusKey="PROXY-open" onPress={show} aria-label="Настроить прокси">
          {loaded ? 'Настроить прокси' : 'Загрузка…'}
        </Button>
      ) : (
        <ListItem
          focusKey="SET-proxy"
          name="Прокси"
          description="Подключение приложения и видео"
          value={loaded ? labels[config.mode] : 'Загрузка…'}
          onPress={show}
        />
      )}
      {open &&
        createPortal(
          <div className={styles.overlay} onClick={(event) => dismissOutside(event, close)} onWheel={(event) => event.stopPropagation()}>
            <form
              ref={form}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={styles.panel}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key !== 'Tab') return

                const elements = Array.from(
                  form.current!.querySelectorAll<HTMLElement>('input:not(:disabled),select:not(:disabled),button:not(:disabled)'),
                )
                const first = elements[0]
                const last = elements[elements.length - 1]

                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault()
                  last?.focus()
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault()
                  first?.focus()
                }
              }}
              onSubmit={(event) => {
                event.preventDefault()
                if (!busy) void save()
              }}
            >
              <h2 id={titleId}>Прокси</h2>
              <p>Применяется к каталогу, изображениям и видео в этом приложении.</p>
              <fieldset disabled={busy}>
                <label>
                  Режим подключения
                  <select
                    aria-label="Режим подключения"
                    value={draft.mode}
                    onChange={(event) => change('mode', event.target.value as ProxyConfig['mode'])}
                  >
                    <option value="system">Системные настройки</option>
                    <option value="direct">Без прокси</option>
                    <option value="manual">Свой прокси</option>
                  </select>
                </label>
                {draft.mode === 'manual' && (
                  <>
                    <label>
                      Тип прокси
                      <select
                        value={draft.protocol}
                        onChange={(event) =>
                          setDraft((value) => ({
                            ...value,
                            protocol: event.target.value as ProxyConfig['protocol'],
                            username: '',
                            password: '',
                            clearPassword: true,
                          }))
                        }
                      >
                        <option value="http">HTTP</option>
                        <option value="socks5">SOCKS5</option>
                      </select>
                    </label>
                    <div className={styles.endpoint}>
                      <label>
                        Сервер
                        <input
                          value={draft.host}
                          placeholder="127.0.0.1 или proxy.example.com"
                          autoComplete="off"
                          spellCheck={false}
                          required
                          onChange={(event) => change('host', event.target.value)}
                        />
                      </label>
                      <label>
                        Порт
                        <input
                          type="number"
                          min="1"
                          max="65535"
                          value={draft.port || ''}
                          required
                          onChange={(event) => change('port', Number(event.target.value))}
                        />
                      </label>
                    </div>
                    {draft.protocol === 'http' ? (
                      <>
                        <label>
                          Логин (если требуется)
                          <input value={draft.username} autoComplete="off" onChange={(event) => change('username', event.target.value)} />
                        </label>
                        <label>
                          Пароль
                          <input
                            type="password"
                            value={draft.password}
                            autoComplete="new-password"
                            placeholder={draft.hasPassword ? 'Сохранён. Оставьте пустым, чтобы не менять' : 'Если требуется'}
                            onChange={(event) => change('password', event.target.value)}
                          />
                        </label>
                        {draft.hasPassword && (
                          <label className={styles.checkbox}>
                            <input
                              type="checkbox"
                              checked={!!draft.clearPassword}
                              onChange={(event) => change('clearPassword', event.target.checked)}
                            />
                            Удалить сохранённый пароль
                          </label>
                        )}
                      </>
                    ) : (
                      <p>SOCKS5 поддерживается без авторизации. Для логина и пароля используйте HTTP.</p>
                    )}
                  </>
                )}
              </fieldset>
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className={styles.success}>
                  {message}
                </p>
              )}
              <div className={styles.actions}>
                <button type="button" onClick={close}>
                  Закрыть
                </button>
                <button type="submit" disabled={busy}>
                  {busy ? 'Применяем…' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  )
}
