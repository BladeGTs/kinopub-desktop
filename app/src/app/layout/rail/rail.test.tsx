import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import type * as SpatialNavigation from '@noriginmedia/norigin-spatial-navigation'
import { ServicesContext } from '@/services/services'
import { fakeServices, type FakeServices } from '@/test/fake-services'
import { Rail } from './rail'

vi.mock('@noriginmedia/norigin-spatial-navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof SpatialNavigation>()),
  setFocus: vi.fn(),
  useFocusable: (config?: { focusKey?: string }) => ({
    ref: { current: null },
    focusKey: config?.focusKey,
    hasFocusedChild: true,
    focused: false,
    focusSelf: vi.fn(),
  }),
}))

let root: Root
let container: HTMLDivElement
let services: FakeServices

beforeEach(() => {
  services = fakeServices()
  services.ui.setPageFocusKey('PAGE-home')
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  flushSync(() => root.unmount())
  container.remove()
})

function leaveRail() {
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <Rail />
      </ServicesContext.Provider>,
    ),
  )
  container.firstElementChild!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
}

describe('rail pointer exit', () => {
  it('returns focus to content when the mouse leaves onto empty space', () => {
    services.ui.setPointer(true)
    leaveRail()
    expect(setFocus).toHaveBeenCalledWith('PAGE-home')
  })
  it('preserves keyboard focus when a resting cursor leaves', () => {
    services.ui.setPointer(false)
    leaveRail()
    expect(setFocus).not.toHaveBeenCalled()
  })
})
