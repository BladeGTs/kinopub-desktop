import { expect, it, vi } from 'vitest'
import { dismissOutside } from './dismiss-outside'

it('dismisses only the backdrop and prevents the click reaching the underlying player', () => {
  const overlay = document.createElement('div')
  const close = vi.fn()
  const event = { target: overlay, currentTarget: overlay, stopPropagation: vi.fn(), preventDefault: vi.fn() }

  dismissOutside(event, close)
  expect(close).toHaveBeenCalledOnce()
  expect(event.stopPropagation).toHaveBeenCalledOnce()
  const child = document.createElement('button')

  dismissOutside({ ...event, target: child }, close)
  expect(close).toHaveBeenCalledOnce()
})
