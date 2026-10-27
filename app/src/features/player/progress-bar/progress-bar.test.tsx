import { afterEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import type * as SpatialNavigation from '@noriginmedia/norigin-spatial-navigation'
import { ServicesContext } from '@/services/services'
import { fakeServices } from '@/test/fake-services'
import type { PlayerScreenViewModel } from '../player-screen.view-model'
import { ProgressBar } from './progress-bar'

vi.mock('@noriginmedia/norigin-spatial-navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof SpatialNavigation>()),
  useFocusable: () => ({ ref: { current: null }, focused: false, focusSelf: vi.fn() }),
}))

let container: HTMLDivElement
let root: Root

function render(duration = 2400) {
  const vm = { duration, progress: 25, remaining: 1800, shownTime: 600, seekToFraction: vi.fn(), togglePlay: vi.fn(), onBarArrow: vi.fn() }

  const services = fakeServices()

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <ProgressBar vm={vm as unknown as PlayerScreenViewModel} focusKey="bar" />
      </ServicesContext.Provider>,
    ),
  )
  const bar = container.firstElementChild!.firstElementChild as HTMLElement

  vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue({ left: 100, width: 400 } as DOMRect)

  return { vm, bar }
}

afterEach(() => {
  flushSync(() => root.unmount())
  container.remove()
})

it('shows the time under the pointer without seeking or changing the current time', async () => {
  const { vm, bar } = render()

  await act(async () => {
    bar.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300 }))
  })
  expect(container.querySelector('[role="tooltip"]')?.textContent).toBe('20:00')
  expect(vm.seekToFraction).not.toHaveBeenCalled()
  expect(vm.shownTime).toBe(600)
  await act(async () => {
    bar.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
  })
  expect(container.querySelector('[role="tooltip"]')).toBeNull()
})

it('clamps the preview to the duration and seeks only on click', async () => {
  const { vm, bar } = render()

  await act(async () => {
    bar.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 600 }))
  })
  expect(container.querySelector('[role="tooltip"]')?.textContent).toBe('40:00')
  bar.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300 }))
  expect(vm.seekToFraction).toHaveBeenCalledWith(0.5)
})

it('does not show a hover time until the duration is known', async () => {
  const { bar } = render(0)

  await act(async () => {
    bar.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300 }))
  })
  expect(container.querySelector('[role="tooltip"]')).toBeNull()
})
