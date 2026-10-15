import { afterEach, expect, it, vi } from 'vitest'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import type * as SpatialNavigation from '@noriginmedia/norigin-spatial-navigation'
import { ServicesContext } from '@/services/services'
import { fakeServices } from '@/test/fake-services'
import { Row } from './row'

vi.mock('@/shared/ui/page', () => ({ usePage: () => ({ page: { reveal: vi.fn() }, locationKey: 'test' }) }))
vi.mock('@noriginmedia/norigin-spatial-navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof SpatialNavigation>()),
  useFocusable: (config?: { focusKey?: string }) => ({
    ref: { current: null },
    focusKey: config?.focusKey,
    focused: false,
    focusSelf: vi.fn(),
  }),
}))

let root: Root
let container: HTMLDivElement

function render(count: number) {
  const services = fakeServices()

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <Row
          focusKey="TEST-row"
          title="Фильмы"
          count={count}
          item={{ width: 232, height: 420 }}
          renderItem={(index) => <div>Фильм {index}</div>}
        />
      </ServicesContext.Provider>,
    ),
  )
}

afterEach(() => {
  flushSync(() => root.unmount())
  container.remove()
})

it('moves the carousel by clicking arrows, without moving merely on hover', () => {
  render(20)
  const left = container.querySelector<HTMLButtonElement>('[aria-label="Фильмы: прокрутить влево"]')!
  const right = container.querySelector<HTMLButtonElement>('[aria-label="Фильмы: прокрутить вправо"]')!
  const track = () => container.querySelector<HTMLElement>('[style*="translateX"]')!

  expect(left.disabled).toBe(true)
  expect(right.disabled).toBe(false)
  right.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
  expect(track().style.transform).toBe('translateX(-0px)')
  flushSync(() => right.click())
  expect(track().style.transform).toBe('translateX(-260px)')
  expect(left.disabled).toBe(false)
  flushSync(() => left.click())
  expect(track().style.transform).toBe('translateX(-0px)')
})

it('does not show carousel arrows when all cards fit', () => {
  render(2)
  expect(container.querySelector('button')).toBeNull()
})
