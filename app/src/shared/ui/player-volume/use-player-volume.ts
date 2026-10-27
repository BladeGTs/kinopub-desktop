import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useServices } from '@/services/services'

export function usePlayerVolume(attachVideo: (element: HTMLVideoElement | null) => void) {
  const { storage } = useServices()
  const [volume, updateVolume] = useState(() => {
    const saved = storage.get('player-volume', 1)

    return typeof saved === 'number' && Number.isFinite(saved) ? Math.max(0, Math.min(1, saved)) : 1
  })
  const [muted, setMuted] = useState(() => storage.get<boolean>('player-muted', false) === true)
  const video = useRef<HTMLVideoElement | null>(null)
  const current = useRef({ volume, muted })

  useLayoutEffect(() => {
    current.current = { volume, muted }
  }, [volume, muted])
  const attach = useCallback(
    (element: HTMLVideoElement | null) => {
      video.current = element
      if (element) {
        element.volume = current.current.volume
        element.muted = current.current.muted
      }

      attachVideo?.(element)
    },
    [attachVideo],
  )

  useEffect(() => {
    if (video.current) {
      video.current.volume = volume
      video.current.muted = muted
    }

    storage.set('player-volume', volume)
    storage.set('player-muted', muted)
  }, [volume, muted, storage])

  const setVolume = (next: number) => {
    if (!Number.isFinite(next)) return

    updateVolume(Math.max(0, Math.min(1, next)))
    setMuted(false)
  }

  const toggleMute = () => {
    if (volume === 0) setVolume(0.5)
    else setMuted(!muted)
  }

  return { attach, volume, muted, setVolume, toggleMute }
}
