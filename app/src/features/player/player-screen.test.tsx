import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import type * as SpatialNavigation from '@noriginmedia/norigin-spatial-navigation'
import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { ChannelPlayerScreen } from '@/features/channels'
import { ServicesContext } from '@/services/services'
import { fakeServices, type FakeServices } from '@/test/fake-services'
import { PlayerScreen } from './player-screen'

const vm = vi.hoisted(() => ({
  playing: true,
  hudVisible: true,
  hudTarget: 'bar',
  hasSource: false,
  panel: null,
  error: '',
  title: 'Test',
  next: { season: 1, video: { number: 2 } },
  playNext: vi.fn(),
  exit: vi.fn(),
  nextUp: { visible: false },
  subtitles: {},
  progress: 0,
  remaining: 0,
  shownTime: 0,
  onSurfaceClick: vi.fn(),
  togglePlay: vi.fn(),
  onPointerMove: vi.fn(),
  onBarArrow: vi.fn(),
  dispose: vi.fn(),
}))

vi.mock('./player-screen.view-model', () => ({
  PlayerScreenViewModel: vi.fn(function () {
    return vm
  }),
}))
vi.mock('@/features/channels/player/channel-player-screen.view-model', () => ({
  ChannelPlayerScreenViewModel: vi.fn(function () {
    return {
      ...vm,
      channel: { id: 1, title: 'Channel' },
      list: [1],
      index: 0,
      showHud: vi.fn(),
      attach: vi.fn(),
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onPlaying: vi.fn(),
      onVideoError: vi.fn(),
    }
  }),
}))
vi.mock('@noriginmedia/norigin-spatial-navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof SpatialNavigation>()),
  setFocus: vi.fn(),
  useFocusable: (config?: { focusKey?: string }) => ({
    ref: { current: null },
    focusKey: config?.focusKey,
    focused: false,
    focusSelf: vi.fn(),
  }),
}))

let container: HTMLDivElement
let root: Root
let services: FakeServices

beforeEach(() => {
  services = fakeServices()
  vi.spyOn(services.ui, 'toggleFullscreen').mockResolvedValue(undefined)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <MemoryRouter>
          <PlayerScreen />
        </MemoryRouter>
      </ServicesContext.Provider>,
    ),
  )
})
afterEach(() => {
  flushSync(() => root.unmount())
  container.remove()
})

it('shows a separate Pause and Fullscreen button without double toggling playback', () => {
  container.querySelector('[aria-label="Пауза"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(vm.togglePlay).toHaveBeenCalledOnce()
  expect(vm.onSurfaceClick).not.toHaveBeenCalled()
  container.querySelector('[aria-label="Полный экран"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(services.ui.toggleFullscreen).toHaveBeenCalledOnce()
  expect(vm.onSurfaceClick).not.toHaveBeenCalled()
})

it('places fullscreen after next episode and exits by mouse without toggling pause', () => {
  const back = vi.fn(() => true)

  services.remote.pushBack(back)
  const next = container.querySelector('[aria-label="Следующая серия"]')!
  const fullscreen = container.querySelector('[aria-label="Полный экран"]')!

  expect(next.compareDocumentPosition(fullscreen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  container.querySelector('[aria-label="Назад"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(back).toHaveBeenCalledOnce()
  expect(vm.onSurfaceClick).not.toHaveBeenCalled()
  expect(vm.togglePlay).not.toHaveBeenCalled()
})

it('toggles on the empty overlay but ignores the video title', () => {
  container.querySelector('[data-player-surface]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(vm.onSurfaceClick).toHaveBeenCalledOnce()
  vm.onSurfaceClick.mockClear()
  const title = [...container.querySelectorAll('div')].find((node) => node.textContent === 'Test')!

  title.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(vm.onSurfaceClick).not.toHaveBeenCalled()
})

it('places keyboard focus on the channel pause button when controls appear', () => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0)

    return 1
  })
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <MemoryRouter>
          <ChannelPlayerScreen />
        </MemoryRouter>
      </ServicesContext.Provider>,
    ),
  )
  expect(setFocus).toHaveBeenCalledWith('CHANNEL-pause')
})

it.each([PlayerScreen, ChannelPlayerScreen])('switches fullscreen on double click without pausing (%s)', (Screen) => {
  vi.useFakeTimers()
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <MemoryRouter>
          <Screen />
        </MemoryRouter>
      </ServicesContext.Provider>,
    ),
  )
  const surface = container.firstElementChild!

  surface.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
  vi.advanceTimersByTime(500)
  surface.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }))
  surface.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
  vi.advanceTimersByTime(500)
  expect(services.ui.toggleFullscreen).toHaveBeenCalledOnce()
  expect(vm.onSurfaceClick).not.toHaveBeenCalled()
  surface.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
  expect(services.ui.toggleFullscreen).toHaveBeenCalledTimes(2)
  container.querySelector('[aria-label="Назад"]')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
  expect(services.ui.toggleFullscreen).toHaveBeenCalledTimes(2)
})

it('keeps single mouse click pause and cancels a pending click when leaving the player', () => {
  vi.useFakeTimers()
  const surface = container.firstElementChild!

  surface.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
  expect(vm.onSurfaceClick).not.toHaveBeenCalled()
  vi.advanceTimersByTime(600)
  expect(vm.onSurfaceClick).toHaveBeenCalledOnce()
  surface.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
  flushSync(() => root.render(null))
  vi.advanceTimersByTime(500)
  expect(vm.onSurfaceClick).toHaveBeenCalledOnce()
})
