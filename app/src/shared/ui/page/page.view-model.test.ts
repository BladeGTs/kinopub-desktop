import { describe, expect, it, vi } from 'vitest'
import { PageViewModel } from './page.view-model'

function page(stackHeight: number, viewport = 1080) {
  const vm = new PageViewModel(120, 0, viewport, false)
  const stack = { offsetHeight: stackHeight } as HTMLElement

  vm.setStack(stack)

  return vm
}

describe('PageViewModel.reveal', () => {
  it('does not scroll for focus taken by the pointer', () => {
    let pointer = false
    const vm = new PageViewModel(120, 0, 1080, false, () => pointer)
    const stack = { offsetHeight: 5000 } as HTMLElement
    const row = { offsetTop: 2000, offsetHeight: 400, offsetParent: stack } as unknown as HTMLElement

    vm.setStack(stack)
    pointer = true
    vm.reveal(row)
    expect(vm.offset).toBe(0)
    pointer = false
    vm.reveal(row)
    expect(vm.offset).toBeGreaterThan(0)
  })
})

describe('PageViewModel.reveal near the end', () => {
  const stack = { offsetHeight: 1500 } as HTMLElement
  const row = (offsetTop: number) => ({ offsetTop, offsetHeight: 96, offsetParent: stack }) as unknown as HTMLElement

  it('shows the whole tail of a plain page when the focused row is close to the bottom', () => {
    const vm = new PageViewModel(120, 0, 1080, false)

    vm.setStack(stack)
    vm.reveal(row(1380))
    expect(vm.offset).toBe(1500 + 60 - 1080)
  })

  it('keeps the minimal scroll for rows far from the end and the pinned rule on hero pages', () => {
    const plain = new PageViewModel(120, 0, 1080, false)
    const tall = { offsetHeight: 3000 } as HTMLElement

    plain.setStack(tall)
    plain.reveal({ offsetTop: 1100, offsetHeight: 96, offsetParent: tall } as unknown as HTMLElement)
    expect(plain.offset).toBe(1100 + 96 + 60 - 1080)

    const hero = new PageViewModel(120, 0, 770, true)

    hero.setStack(stack)
    hero.reveal(row(1380))
    expect(hero.offset).toBe(1380 - 120)
  })
})

describe('PageViewModel.scrollBy', () => {
  it('animates a wheel notch over frames without losing accumulated trackpad deltas', () => {
    vi.useFakeTimers()
    const vm = page(5000)

    vm.scrollBy(100)
    expect(vm.scrollOffset).toBe(0)
    vi.advanceTimersByTime(32)
    const firstFrame = vm.scrollOffset

    expect(firstFrame).toBeGreaterThan(0)
    expect(firstFrame).toBeLessThan(100)
    vm.scrollBy(0.5)
    vm.scrollBy(1.5)
    expect(vm.offset).toBe(102)
    vi.advanceTimersByTime(32)
    expect(vm.scrollOffset).toBeGreaterThan(firstFrame)
    expect(vm.scrollOffset).toBeLessThan(102)
    vi.advanceTimersByTime(600)
    expect(vm.scrollOffset).toBe(102)
    expect(vm.wheelScrolling).toBe(false)
    vm.dispose()
  })

  it('cancels animated wheel movement when the page is disposed', () => {
    vi.useFakeTimers()
    const vm = page(5000)

    vm.scrollBy(100)
    vm.dispose()
    const offset = vm.scrollOffset

    vi.advanceTimersByTime(600)
    expect(vm.scrollOffset).toBe(offset)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('preserves small trackpad deltas instead of turning every event into a large step', () => {
    const vm = page(5000)

    vm.scrollBy(100)
    expect(vm.offset).toBe(100)
    vm.scrollBy(1)
    expect(vm.offset).toBe(101)
    vm.scrollBy(0.5)
    expect(vm.offset).toBe(101.5)
    vm.scrollBy(-1.5)
    expect(vm.offset).toBe(100)
    vm.dispose()
  })

  it('normalizes wheel line/page units and finishes frame animation after a continuous gesture', () => {
    vi.useFakeTimers()
    const vm = page(5000)

    vm.scrollBy(3, 1)
    expect(vm.offset).toBe(48)
    vm.scrollBy(1, 2)
    expect(vm.offset).toBe(1128)
    expect(vm.wheelScrolling).toBe(true)
    vi.advanceTimersByTime(100)
    vm.scrollBy(2)
    vi.advanceTimersByTime(100)
    expect(vm.wheelScrolling).toBe(true)
    vi.advanceTimersByTime(100)
    vi.advanceTimersByTime(300)
    expect(vm.wheelScrolling).toBe(false)
    vm.dispose()
  })

  it('stays within the content and ignores zero deltas', () => {
    const vm = page(1500)

    vm.scrollBy(-100)
    expect(vm.offset).toBe(0)
    vm.scrollBy(1000)
    expect(vm.offset).toBe(1500 + 60 - 1080)
    vm.scrollBy(0)
    expect(vm.offset).toBe(1500 + 60 - 1080)
    vm.dispose()
  })

  it('does nothing for content that fits or without a stack', () => {
    expect(() => new PageViewModel(120, 0, 1080, false).scrollBy(100)).not.toThrow()
    const vm = page(800)

    vm.scrollBy(100)
    expect(vm.offset).toBe(0)
  })
})
