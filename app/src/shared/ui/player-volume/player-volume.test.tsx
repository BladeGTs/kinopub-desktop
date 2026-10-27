import { afterEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import type * as SpatialNavigation from '@noriginmedia/norigin-spatial-navigation'
import { ServicesContext } from '@/services/services'
import { fakeServices } from '@/test/fake-services'
import { PlayerVolume, usePlayerVolume } from './index'

vi.mock('@noriginmedia/norigin-spatial-navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof SpatialNavigation>()),
  getCurrentFocusKey: () => '',
  useFocusable: () => ({ ref: { current: null }, focused: false, focusSelf: vi.fn() }),
}))

let root: Root
let container: HTMLDivElement

const attachVideo = vi.fn()

function TestPlayer() {
  const { attach, ...volume } = usePlayerVolume(attachVideo)

  return (
    <>
      <video ref={attach} />
      <PlayerVolume controller={volume} focusKey="test-volume" active />
    </>
  )
}

function render(saved = 1) {
  const services = fakeServices()

  services.storage.set('player-volume', saved)

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <TestPlayer />
      </ServicesContext.Provider>,
    ),
  )

  return { services, video: container.querySelector('video')! }
}

afterEach(() => {
  flushSync(() => root.unmount())
  container.remove()
})

it('restores player volume and mutes without losing the selected level', async () => {
  const { video } = render(0.4)

  expect(video.volume).toBe(0.4)
  await act(async () => container.querySelector<HTMLElement>('[aria-label="Выключить звук"]')!.click())
  expect(video.muted).toBe(true)
  expect(video.volume).toBe(0.4)
  await act(async () => container.querySelector<HTMLElement>('[aria-label="Включить звук"]')!.click())
  expect(video.muted).toBe(false)
  expect(video.volume).toBe(0.4)
})

it('changes volume with up/down only while the mouse is over its control', async () => {
  const { video, services } = render(0.4)
  const control = container.querySelector('[data-player-volume]')!

  await act(async () => control.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', keyCode: 38 })))
  expect(video.volume).toBeCloseTo(0.45)
  expect(services.storage.get('player-volume', 1)).toBeCloseTo(0.45)
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40 })))
  expect(video.volume).toBeCloseTo(0.4)
  await act(async () => control.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })))
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', keyCode: 38 })))
  expect(video.volume).toBeCloseTo(0.4)
})

it('applies the slider without changing system volume', async () => {
  const { video } = render()
  const slider = container.querySelector<HTMLInputElement>('[aria-label="Громкость"]')!

  await act(async () => {
    slider.value = '25'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(video.volume).toBe(0.25)
})
