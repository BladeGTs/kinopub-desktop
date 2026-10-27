import { afterEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import type * as SpatialNavigation from '@noriginmedia/norigin-spatial-navigation'
import type { Video } from '@/services/api/api.types'
import { ServicesContext } from '@/services/services'
import { fakeServices } from '@/test/fake-services'
import type { PlayerScreenViewModel } from '../player-screen.view-model'
import { EpisodesPanel } from './episodes-panel'

vi.mock('@noriginmedia/norigin-spatial-navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof SpatialNavigation>()),
  setFocus: vi.fn(),
  useFocusable: (config?: { focusKey?: string; onFocus?: (layout: { node: null }) => void }) => ({
    ref: { current: null },
    focusKey: config?.focusKey,
    focused: false,
    focusSelf: () => config?.onFocus?.({ node: null }),
  }),
}))
let root: Root
let container: HTMLDivElement

afterEach(() => {
  flushSync(() => root.unmount())
  container.remove()
})

const video = (id: number, title: string) => ({ id, title, number: 1, duration: 1200, watched: 0, watching: { time: 0 } }) as Video

it('keeps the displayed season on hover and switches it only after clicking', async () => {
  const services = fakeServices()
  const player = {
    episodeSeasons: [
      { number: 1, videos: [video(11, 'Первая серия')] },
      { number: 2, videos: [video(21, 'Вторая история')] },
    ],
    video: { id: 11 },
    closePanel: vi.fn(),
    playEpisode: vi.fn(),
  }

  services.ui.setPointer(true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  flushSync(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <EpisodesPanel player={player as unknown as PlayerScreenViewModel} />
      </ServicesContext.Provider>,
    ),
  )
  const secondSeason = [...container.querySelectorAll('span')].find((node) => node.textContent === 'Сезон 2')!.parentElement!

  await act(async () => secondSeason.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })))
  expect(container.querySelector('h2')!.textContent).toBe('Сезон 1')
  await act(async () => secondSeason.click())
  expect(container.querySelector('h2')!.textContent).toBe('Сезон 2')
  expect(container.textContent).toContain('Вторая история')
  expect(player.playEpisode).not.toHaveBeenCalled()
})
