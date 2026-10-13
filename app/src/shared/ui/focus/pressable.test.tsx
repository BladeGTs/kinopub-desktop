import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushSync } from 'react-dom'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { AuthService } from '@/services/auth/auth.service'
import type { ApiService } from '@/services/api/api.service'
import { StorageService } from '@/services/storage/storage.service'
import { fakeApi } from '@/test/fake-services'
import { Pressable } from './pressable'

vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: vi.fn(() => ({ ref: { current: null }, focused: false, focusSelf: vi.fn() })),
}))
const ui = vi.hoisted(() => ({ pointer: false }))

vi.mock('@/services/services', () => ({ useServices: () => ({ ui }) }))
beforeEach(() => {
  ui.pointer = false
  vi.mocked(useFocusable).mockReturnValue({
    ref: { current: null },
    focused: false,
    focusSelf: vi.fn(),
    hasFocusedChild: false,
    focusKey: 'TEST',
  } as ReturnType<typeof useFocusable>)
})

let root: Root | undefined
let container: HTMLDivElement

function render(onPress: () => void) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  flushSync(() => root!.render(<Pressable onPress={onPress}>Request code</Pressable>))
}

afterEach(() => {
  if (root) flushSync(() => root!.unmount())

  root = undefined
  container?.remove()
})

describe('Pressable activation', () => {
  it('clears pointer highlight on mouse leave even if spatial focus stays on the button', async () => {
    ui.pointer = true
    vi.mocked(useFocusable).mockReturnValue({
      ref: { current: null },
      focused: true,
      focusSelf: vi.fn(),
      hasFocusedChild: false,
      focusKey: 'TEST',
    } as ReturnType<typeof useFocusable>)
    render(vi.fn())
    const button = container.firstElementChild!

    await act(async () => {
      button.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
    })
    expect(button.classList.contains('is-focused')).toBe(true)
    await act(async () => {
      button.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
    })
    expect(button.classList.contains('is-focused')).toBe(false)
  })

  it('keeps keyboard focus visible after mouse leave', () => {
    vi.mocked(useFocusable).mockReturnValue({
      ref: { current: null },
      focused: true,
      focusSelf: vi.fn(),
      hasFocusedChild: false,
      focusKey: 'TEST',
    } as ReturnType<typeof useFocusable>)
    render(vi.fn())
    const button = container.firstElementChild!

    flushSync(() => button.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })))
    expect(button.classList.contains('is-focused')).toBe(true)
  })
  it('focuses the clicked control even without a preceding mouse movement', () => {
    render(vi.fn())
    const focusSelf = vi.mocked(useFocusable).mock.results.at(-1)!.value.focusSelf

    container.firstElementChild!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(focusSelf).toHaveBeenCalledOnce()
  })
  it('calls onPress without forwarding a mouse event', () => {
    const onPress = vi.fn()

    render(onPress)
    container.firstElementChild!.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onPress).toHaveBeenCalledExactlyOnceWith()
  })

  it('calls onPress without forwarding spatial navigation metadata', () => {
    const onPress = vi.fn()

    render(onPress)
    const options = vi.mocked(useFocusable).mock.calls.at(-1)![0]!
    const enter = options.onEnterPress as (...args: unknown[]) => void

    enter({ focusKey: 'PAIR-refresh' }, { pressedKeys: { Enter: 1 } })

    expect(onPress).toHaveBeenCalledExactlyOnceWith()
  })

  it('keeps the pairing error a string when requesting a code with the mouse', () => {
    const api = fakeApi()

    api.requestDeviceCode.mockReturnValue(new Promise(() => {}))
    const auth = new AuthService(new StorageService(), api as unknown as ApiService)

    render(auth.startPairing)
    container.firstElementChild!.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(auth.pairingError).toBe('')
    expect(api.requestDeviceCode).toHaveBeenCalledOnce()
  })
})
