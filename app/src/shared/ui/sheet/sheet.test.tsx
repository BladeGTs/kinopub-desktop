import { afterEach, expect, it, vi } from 'vitest'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import type * as SpatialNavigation from '@noriginmedia/norigin-spatial-navigation'
import { ServicesContext } from '@/services/services'
import { fakeServices } from '@/test/fake-services'
import { Sheet } from './sheet'

vi.mock('@noriginmedia/norigin-spatial-navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof SpatialNavigation>()),
  setFocus: vi.fn(),
  useFocusable: (config?: { focusKey?: string }) => ({ ref: { current: null }, focusKey: config?.focusKey }),
}))
let root: Root
let container: HTMLDivElement

afterEach(() => {
  if (root) flushSync(() => root.unmount())

  container?.remove()
})

it('closes country filters outside the panel but keeps clicks inside the menu', () => {
  const close = vi.fn()
  const services = fakeServices()

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <Sheet title="Страна" onClose={close}>
          <button>Россия</button>
        </Sheet>
      </ServicesContext.Provider>,
    ),
  )
  container.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(close).not.toHaveBeenCalled()
  container.firstElementChild!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(close).toHaveBeenCalledOnce()
})
