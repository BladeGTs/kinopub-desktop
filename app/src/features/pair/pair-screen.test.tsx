import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import type * as SpatialNavigation from '@noriginmedia/norigin-spatial-navigation'
import { ServicesContext } from '@/services/services'
import { fakeServices } from '@/test/fake-services'
import { PairScreen } from './pair-screen'

vi.mock('@noriginmedia/norigin-spatial-navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof SpatialNavigation>()),
  useFocusable: (config?: { focusKey?: string }) => ({
    ref: { current: null },
    focusKey: config?.focusKey,
    focused: false,
    focusSelf: vi.fn(),
  }),
}))

let container: HTMLDivElement
let root: Root
let services: ReturnType<typeof fakeServices>

beforeEach(() => {
  services = fakeServices()
  services.auth.device = { code: 'device', user_code: 'ABCD', verification_uri: 'https://kino.pub/device', interval: 5, expires_in: 600 }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  flushSync(() => root.unmount())
  container.remove()
  delete window.desktop
})
function render() {
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <PairScreen />
      </ServicesContext.Provider>,
    ),
  )
}

it('opens the activation URL only after clicking the link', () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null)

  render()
  expect(open).not.toHaveBeenCalled()
  container.querySelector('[role="link"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(open).toHaveBeenCalledWith('https://kino.pub/device', '_blank', 'noopener,noreferrer')
})

it('copies the displayed code via Electron and confirms success', async () => {
  const copyDeviceCode = vi.fn().mockResolvedValue(true)

  window.desktop = { toggleFullscreen: vi.fn(), copyDeviceCode }
  render()
  await act(async () => {
    container.querySelector('[aria-label="Скопировать код устройства"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect(copyDeviceCode).toHaveBeenCalledWith('ABCD')
  expect(container.querySelector('[aria-live]')!.textContent).toBe('Скопировано')
})

it('reports a failed copy without claiming success', async () => {
  window.desktop = { toggleFullscreen: vi.fn(), copyDeviceCode: vi.fn().mockResolvedValue(false) }
  render()
  await act(async () => {
    container.querySelector('[aria-label="Скопировать код устройства"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect(container.querySelector('[aria-live]')!.textContent).toContain('Не удалось скопировать')
})

it('does not offer to copy an unavailable device code', () => {
  services.auth.device = null
  render()
  expect(container.querySelector('[aria-label="Скопировать код устройства"]')).toBeNull()
})
