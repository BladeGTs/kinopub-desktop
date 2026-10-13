import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteKey, RemoteService } from './remote.service'

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

  target.dispatchEvent(event)

  return event
}

describe('RemoteService', () => {
  let remote: RemoteService

  beforeEach(() => {
    remote = new RemoteService()
  })

  afterEach(() => {
    remote.dispose()
  })

  it('calls the most recently pushed handler first', () => {
    const order: string[] = []

    remote.push(() => {
      order.push('first')
    })
    remote.push(() => {
      order.push('second')
    })
    press('Enter')

    expect(order).toEqual(['second', 'first'])
  })

  it('runs Back as a direct action without creating or dispatching a keyboard event', () => {
    const below = vi.fn(() => true)
    const top = vi.fn(() => true)
    const keyListener = vi.fn()
    const keyConstructor = vi.spyOn(window, 'KeyboardEvent')

    window.addEventListener('keydown', keyListener)
    remote.pushBack(below)
    const unsubscribe = remote.pushBack(top)

    remote.back()
    expect(top).toHaveBeenCalledOnce()
    expect(below).not.toHaveBeenCalled()
    expect(keyListener).not.toHaveBeenCalled()
    expect(keyConstructor).not.toHaveBeenCalled()
    expect(top).toHaveBeenCalledWith()
    unsubscribe()
    remote.back()
    expect(below).toHaveBeenCalledOnce()
    window.removeEventListener('keydown', keyListener)
  })

  it('routes keyboard Back and direct Back to the same action, preserving layer order', () => {
    const key = vi.fn(() => false)
    const back = vi.fn(() => true)
    const modal = vi.fn(() => true)

    remote.push(key, back)
    const close = remote.pushBack(modal)

    remote.back()
    expect(modal).toHaveBeenCalledOnce()
    expect(back).not.toHaveBeenCalled()
    close()
    remote.back()
    expect(back).toHaveBeenCalledOnce()
    expect(key).not.toHaveBeenCalled()
    const closeAgain = remote.pushBack(modal)

    press('Escape')
    expect(modal).toHaveBeenCalledTimes(2)
    closeAgain()
    press('Escape')
    expect(back).toHaveBeenCalledTimes(2)
    expect(key).not.toHaveBeenCalled()
  })

  it('stops propagation and prevents default when a handler returns true', () => {
    const below = vi.fn()

    remote.push(below)
    remote.push(() => true)
    const event = press('ArrowDown')

    expect(below).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(true)
  })

  it('lets the event pass down when handlers return false or nothing', () => {
    const below = vi.fn(() => false)

    remote.push(below)
    remote.push(() => undefined)
    const event = press('ArrowUp')

    expect(below).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(false)
  })

  it('removes a handler when its unsubscribe is called', () => {
    const handler = vi.fn()
    const unsubscribe = remote.push(handler)

    unsubscribe()
    unsubscribe()
    press('Enter')

    expect(handler).not.toHaveBeenCalled()
  })

  it('removes only the last pushed copy of a handler pushed twice', () => {
    const handler = vi.fn()

    remote.push(handler)
    const unsubscribe = remote.push(handler)

    unsubscribe()
    press('Enter')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('stops listening after dispose', () => {
    const handler = vi.fn()

    remote.push(handler)
    remote.dispose()
    press('Enter')

    expect(handler).not.toHaveBeenCalled()
  })

  it('catches events during the capture phase, before page handlers', () => {
    const order: string[] = []
    const button = document.body.appendChild(document.createElement('button'))

    button.addEventListener('keydown', () => order.push('button'))
    remote.push(() => {
      order.push('remote')
    })
    press('Enter', {}, button)

    expect(order).toEqual(['remote', 'button'])
    button.remove()
  })
})

describe('RemoteService.isBack', () => {
  it('recognises the webOS back key code and the GoBack / Escape keys', () => {
    expect(RemoteService.isBack(new KeyboardEvent('keydown', { keyCode: RemoteKey.Back }))).toBe(true)
    expect(RemoteService.isBack(new KeyboardEvent('keydown', { key: 'GoBack' }))).toBe(true)
    expect(RemoteService.isBack(new KeyboardEvent('keydown', { key: 'Escape' }))).toBe(true)
  })

  it('treats Backspace as back only outside text inputs', () => {
    const div = document.body.appendChild(document.createElement('div'))
    const input = document.body.appendChild(document.createElement('input'))
    const textarea = document.body.appendChild(document.createElement('textarea'))
    const captured: KeyboardEvent[] = []
    const capture = (event: KeyboardEvent) => captured.push(event)

    window.addEventListener('keydown', capture)
    press('Backspace', {}, div)
    press('Backspace', {}, input)
    press('Backspace', {}, textarea)
    window.removeEventListener('keydown', capture)

    expect(captured.map((event) => RemoteService.isBack(event))).toEqual([true, false, false])
    div.remove()
    input.remove()
    textarea.remove()
  })

  it('does not treat other keys as back', () => {
    expect(RemoteService.isBack(new KeyboardEvent('keydown', { key: 'Enter', keyCode: RemoteKey.Enter }))).toBe(false)
    expect(RemoteService.isBack(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))).toBe(false)
  })
})
