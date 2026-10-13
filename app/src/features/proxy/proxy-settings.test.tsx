import { afterEach, expect, it, vi } from 'vitest'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import type * as SpatialNavigation from '@noriginmedia/norigin-spatial-navigation'
import { ServicesContext } from '@/services/services'
import { fakeServices } from '@/test/fake-services'
import { ProxySettings } from './proxy-settings'

vi.mock('@noriginmedia/norigin-spatial-navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof SpatialNavigation>()),
  setFocus: vi.fn(),
  getCurrentFocusKey: () => 'PROXY-open',
  useFocusable: () => ({ ref: { current: null }, focused: false, focusSelf: vi.fn() }),
}))
let root: Root
let container: HTMLDivElement
const config = { mode: 'system' as const, protocol: 'http' as const, host: '', port: 8080, username: '', password: '' }

afterEach(() => {
  if (root) flushSync(() => root.unmount())

  container?.remove()
  delete window.desktop
})

async function renderProxy() {
  const save = vi.fn().mockResolvedValue({ ok: true, config: { ...config, mode: 'direct' } })
  const services = fakeServices()

  window.desktop = { toggleFullscreen: vi.fn(), getProxy: vi.fn().mockResolvedValue(config), setProxy: save }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <ProxySettings variant="button" />
      </ServicesContext.Provider>,
    ),
  )
  await vi.waitFor(() => expect(window.desktop!.getProxy).toHaveBeenCalledOnce())
  await vi.waitFor(() => expect(container.querySelector('[aria-label="Настроить прокси"]')?.textContent).toBe('Настроить прокси'))
  flushSync(() => container.querySelector('[aria-label="Настроить прокси"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true })))

  return save
}

it('applies direct connection through the native API and shows the result', async () => {
  const save = await renderProxy()
  const mode = document.querySelector<HTMLSelectElement>('[aria-label="Режим подключения"]')!

  flushSync(() => {
    mode.value = 'direct'
    mode.dispatchEvent(new Event('change', { bubbles: true }))
  })
  flushSync(() => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  await vi.waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ mode: 'direct' })))
  await vi.waitFor(() => expect(document.querySelector('[role="status"]')?.textContent).toContain('сохранены'))
})

it('keeps the dialog open on an inside click and dismisses its backdrop without saving', async () => {
  const save = await renderProxy()
  const dialog = document.querySelector('[role="dialog"]')!

  flushSync(() => dialog.querySelector('h2')!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  flushSync(() => dialog.parentElement!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(save).not.toHaveBeenCalled()
})
