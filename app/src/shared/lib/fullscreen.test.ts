import { afterEach, expect, it, vi } from 'vitest'
import { toggleFullscreen } from './fullscreen'

afterEach(() => {
  delete window.desktop
  Reflect.deleteProperty(document.documentElement, 'requestFullscreen')
  Reflect.deleteProperty(document, 'exitFullscreen')
  Reflect.deleteProperty(document, 'fullscreenElement')
})

it('uses the Electron window API for native fullscreen', async () => {
  const toggle = vi.fn().mockResolvedValue(true)

  window.desktop = { toggleFullscreen: toggle }
  await toggleFullscreen()
  expect(toggle).toHaveBeenCalledExactlyOnceWith()
})

it('requests fullscreen for the whole document in a browser', async () => {
  const request = vi.fn().mockResolvedValue(undefined)

  Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: request })
  await toggleFullscreen()
  expect(request).toHaveBeenCalledOnce()
})

it('exits browser fullscreen when already active', async () => {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => document.documentElement })
  const exit = vi.fn().mockResolvedValue(undefined)

  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit })
  await toggleFullscreen()
  expect(exit).toHaveBeenCalledOnce()
})
