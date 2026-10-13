import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import type * as SpatialNavigation from '@noriginmedia/norigin-spatial-navigation'
import { ServicesContext } from '@/services/services'
import { fakeServices, type FakeServices } from '@/test/fake-services'
import { SettingSelect } from './setting-select'

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

let root: Root
let container: HTMLDivElement
let services: FakeServices
const select = vi.fn()

beforeEach(() => {
  services = fakeServices()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <SettingSelect
          name="Quality"
          focusKey="QUALITY"
          value="auto"
          options={[
            { id: 'auto', title: 'Auto' },
            { id: '1080p', title: '1080p' },
          ]}
          onSelect={select}
        />
      </ServicesContext.Provider>,
    ),
  )
})
afterEach(() => {
  flushSync(() => root.unmount())
  container.remove()
})

function open() {
  flushSync(() => container.querySelector('[aria-haspopup="listbox"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

describe('setting dropdown', () => {
  it('direct Back closes only the dropdown without a keyboard event or page navigation', () => {
    const pageBack = vi.fn(() => true)

    services.remote.pushBack(pageBack)
    open()
    const keyboard = vi.spyOn(window, 'KeyboardEvent')

    flushSync(() => services.remote.back())
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(pageBack).not.toHaveBeenCalled()
    expect(keyboard).not.toHaveBeenCalled()
    services.remote.back()
    expect(pageBack).toHaveBeenCalledOnce()
  })
  it('opens all choices and saves the exact clicked value, then closes', () => {
    open()
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(2)
    expect(document.querySelector('[aria-selected="true"]')?.textContent).toContain('Auto')
    flushSync(() => document.querySelectorAll('[role="option"]')[1].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(select).toHaveBeenCalledExactlyOnceWith('1080p')
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })
  it('closes on Escape without changing the setting or navigating back', () => {
    open()
    const back = vi.fn(() => true)

    // Register the page handler before reopening, below the dropdown handler.
    flushSync(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    services.remote.push(back)
    open()
    flushSync(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(back).not.toHaveBeenCalled()
    expect(select).not.toHaveBeenCalled()
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })
  it('closes on a click outside the list', () => {
    open()
    const overlay = document.querySelector('[role="listbox"]')!.parentElement!

    flushSync(() => overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(select).not.toHaveBeenCalled()
  })
})
