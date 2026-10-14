import { getCurrentFocusKey, setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { observer } from 'mobx-react-lite'
import { useEffect, type MouseEvent } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router'
import type { QualityPreference } from '@/services/settings/settings.service'
import { episodeLabel } from '@/shared/lib/format'
import { cx } from '@/shared/lib/cx'
import { usePlayerClicks } from '@/shared/lib/use-player-clicks'
import { isPlayerSurface } from '@/shared/lib/player-input'
import { focusPlayerWindow } from '@/shared/lib/player-window-focus'
import { Button } from '@/shared/ui/button'
import { FocusGroup } from '@/shared/ui/focus'
import { IconNext, IconPause, IconPlay, IconSpark, IconStack, IconSubs, IconFullscreen } from '@/shared/ui/icons'
import { BackButton } from '@/shared/ui/back-button'
import { useServices } from '@/services/services'
import { useViewModel } from '@/shared/view-model/use-view-model'
import { ControlButton } from './controls/control-button'
import { EpisodesPanel } from './episodes-panel/episodes-panel'
import { NEXT_UP_FOCUS_KEY, NextUpCard } from './next-up/next-up-card'
import { PauseScreen } from './pause-screen/pause-screen'
import { PlayerPanel } from './panel/player-panel'
import { PlayerScreenViewModel } from './player-screen.view-model'
import { ProgressBar } from './progress-bar/progress-bar'
import { playerShell as shell } from '@/shared/ui/player-shell'
import styles from './player-screen.module.css'
import { Spinner } from '@/shared/ui/spinner'

const ICON = { episodes: <IconStack />, tracks: <IconSubs />, quality: <IconSpark />, next: <IconNext /> }

const FOCUS = {
  bar: 'PLAYER-bar',
  tracks: 'PLAYER-tracks',
  quality: 'PLAYER-quality',
  episodes: 'PLAYER-episodes',
  next: NEXT_UP_FOCUS_KEY,
  back: 'PLAYER-back',
  retry: 'PLAYER-retry',
}

/** Quality and episode changes replace the route; keying by history entry recreates the player and its view-model. */
export function PlayerScreen() {
  const location = useLocation()

  return <PlayerContent key={location.key} />
}

const PlayerContent = observer(function PlayerContent() {
  const { ui } = useServices()
  const { id = '0', videoId = '0' } = useParams()
  const [search] = useSearchParams()
  const location = useLocation()
  const state = location.state as { trailer?: string; autoplayChain?: number } | null
  const vm = useViewModel(
    (services) =>
      new PlayerScreenViewModel(services, {
        itemId: Number(id),
        videoId: Number(videoId),
        startTime: Number(search.get('t')) || 0,
        quality: (search.get('q') as QualityPreference | null) ?? undefined,
        trailerUrl: state?.trailer,
        autoplayChain: state?.autoplayChain,
      }),
  )

  const surfaceClicks = usePlayerClicks(vm.onSurfaceClick, ui.toggleFullscreen)
  const onPointerMove = (event: MouseEvent<HTMLDivElement>) => {
    vm.onPointerMove()
    if (!isPlayerSurface(event.target, event.currentTarget) || vm.panel || vm.error || vm.nextUp.visible) return

    if (getCurrentFocusKey() !== FOCUS.bar) setFocus(FOCUS.bar)

    focusPlayerWindow(event.currentTarget)
  }

  useEffect(() => {
    // The error screen must grab focus, otherwise it stays on the HUD buttons underneath.
    // Buttons register with navigation asynchronously, so focus on the next frame.
    if (vm.error) {
      const frame = requestAnimationFrame(() => setFocus(FOCUS.retry))

      return () => cancelAnimationFrame(frame)
    }
    if (vm.nextUp.visible) {
      const frame = requestAnimationFrame(() => setFocus(FOCUS.next))

      return () => cancelAnimationFrame(frame)
    }
    if (vm.panel) return
    if (vm.hudVisible) setFocus(FOCUS[vm.hudTarget])
  }, [vm.nextUp.visible, vm.hudVisible, vm.hudTarget, vm.hasSource, vm.error, vm.panel])

  return (
    <div
      className={cx(
        shell.player,
        (vm.hudVisible || vm.nextUp.visible) && styles.hudOpen,
        (vm.hudVisible || vm.panel || vm.error || vm.nextUp.visible) && shell.cursorVisible,
      )}
      tabIndex={-1}
      onMouseMove={onPointerMove}
      onMouseEnter={onPointerMove}
      {...surfaceClicks}
    >
      {vm.hasSource && (
        // Fallback needs a fresh element: the old one is bound to hls.js's MediaSource.
        <video key={vm.fallback ? 'file' : 'stream'} ref={vm.attach} src={vm.src} autoPlay playsInline crossOrigin="anonymous">
          {vm.subtitles.url && (
            <track kind="subtitles" src={vm.subtitles.url} srcLang={vm.subtitles.lang} label={vm.subtitles.label} default />
          )}
        </video>
      )}

      {vm.buffering && !vm.error && (
        <div className={shell.playerCenter}>
          <Spinner />
        </div>
      )}
      {vm.flash && (
        <div className={shell.playerCenter} key={vm.flash}>
          <div className={styles.playerFlash}>{vm.flash === 'play' ? <IconPlay /> : <IconPause />}</div>
        </div>
      )}

      {vm.error && (
        <div className={shell.playerError}>
          <h3>Не удалось запустить видео</h3>
          <p>{vm.error}</p>
          <FocusGroup focusKey="PLAYER-error" className={shell.playerErrorActions} preferredChildFocusKey={FOCUS.retry} isFocusBoundary>
            <Button primary focusKey={FOCUS.retry} onPress={vm.retry}>
              Повторить
            </Button>
            <Button focusKey={FOCUS.back} onPress={vm.exit}>
              Назад
            </Button>
          </FocusGroup>
        </div>
      )}

      {/* Panels cover the HUD completely: it would show through their dimmed backdrop. */}
      <div className={cx(shell.playerHud, vm.hudVisible && !vm.panel && shell.isVisible)} data-player-surface>
        <div className={shell.playerDock}>
          <div className={shell.playerTitle}>{vm.title}</div>
          {vm.subtitle && <div className={shell.playerSubtitle}>{vm.subtitle}</div>}

          <ProgressBar vm={vm} focusKey={FOCUS.bar} />

          <FocusGroup
            focusKey="PLAYER-controls"
            className={styles.playerControls}
            isFocusBoundary
            focusBoundaryDirections={['left', 'right', 'down']}
          >
            <ControlButton
              focusKey="PLAYER-pause"
              icon={vm.playing ? <IconPause /> : <IconPlay />}
              label={vm.playing ? 'Пауза' : 'Продолжить'}
              onPress={vm.togglePlay}
            />
            {vm.hasEpisodes && <ControlButton focusKey={FOCUS.episodes} icon={ICON.episodes} label="Серии" onPress={vm.openEpisodes} />}
            {vm.hasTracks && <ControlButton focusKey={FOCUS.tracks} icon={ICON.tracks} label={vm.tracksLabel} onPress={vm.openTracks} />}
            {vm.hasQualityChoice && (
              <ControlButton
                focusKey={FOCUS.quality}
                icon={ICON.quality}
                label="Качество"
                value={vm.qualityLabel}
                onPress={vm.openQuality}
              />
            )}
            {vm.next && (
              <ControlButton
                icon={ICON.next}
                label="Следующая серия"
                value={episodeLabel(vm.next.season, vm.next.video.number)}
                onPress={vm.playNext}
              />
            )}
            <div className={shell.playerFullscreen}>
              <ControlButton focusKey="PLAYER-fullscreen" icon={<IconFullscreen />} label="Полный экран" onPress={ui.toggleFullscreen} />
            </div>
          </FocusGroup>
        </div>
      </div>

      {vm.nextUp.visible && vm.next && <NextUpCard nextUp={vm.nextUp} next={vm.next} onExit={vm.exit} />}
      {vm.pauseScreen && <PauseScreen vm={vm} />}
      {vm.panel === 'episodes' && <EpisodesPanel player={vm} />}
      {(vm.panel === 'tracks' || vm.panel === 'quality') && <PlayerPanel vm={vm} />}
      <div
        className={cx(
          shell.playerTopbar,
          (vm.hudVisible || vm.pauseScreen || vm.error || vm.panel || vm.nextUp.visible) && shell.isVisible,
        )}
      >
        <BackButton focusKey="PLAYER-exit" />
      </div>
    </div>
  )
})
