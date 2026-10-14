import { afterEach, expect, it, vi } from 'vitest'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import type { Location } from 'react-router'
import { ServicesContext } from '@/services/services'
import { fakeServices } from '@/test/fake-services'
import { PageTitle } from '@/shared/ui/page-title'

vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: () => ({ ref: { current: null }, focused: false, focusSelf: vi.fn() }),
}))

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(() => {
  if (root) flushSync(() => root!.unmount())

  container?.remove()
})

it.each(['/settings', '/channels', '/item/42'])('places an icon-only Back beside the heading on %s', (pathname) => {
  const services = fakeServices()
  const back = vi.fn(() => true)

  services.router.location = { pathname } as Location
  services.remote.pushBack(back)
  container = document.body.appendChild(document.createElement('div'))
  root = createRoot(container)
  flushSync(() =>
    root!.render(
      <ServicesContext.Provider value={services}>
        <PageTitle>Заголовок</PageTitle>
      </ServicesContext.Provider>,
    ),
  )
  const button = container.querySelector('[aria-label="Назад"]')!

  expect(button.getAttribute('role')).toBe('button')
  expect(button.querySelector('svg')).not.toBeNull()
  expect(button.textContent).toBe('')
  expect(button.parentElement?.parentElement?.contains(container.querySelector('h1'))).toBe(true)
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(back).toHaveBeenCalledOnce()
})

it('keeps the home heading without a Back button', () => {
  const services = fakeServices()

  container = document.body.appendChild(document.createElement('div'))
  root = createRoot(container)
  flushSync(() =>
    root!.render(
      <ServicesContext.Provider value={services}>
        <PageTitle>Главная</PageTitle>
      </ServicesContext.Provider>,
    ),
  )
  expect(container.querySelector('h1')?.textContent).toBe('Главная')
  expect(container.querySelector('[aria-label="Назад"]')).toBeNull()
})
