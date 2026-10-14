import { observer } from 'mobx-react-lite'
import { useEffect, type MouseEvent } from 'react'
import { getCurrentFocusKey, setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useParams } from 'react-router'
import { cx } from '@/shared/lib/cx'
import { useViewModel } from '@/shared/view-model/use-view-model'
import { ChannelPlayerScreenViewModel } from './channel-player-screen.view-model'
import { playerShell as styles } from '@/shared/ui/player-shell'
import { Spinner } from '@/shared/ui/spinner'
import { useServices } from '@/services/services'
import { usePlayerClicks } from '@/shared/lib/use-player-clicks'
import { isPlayerSurface } from '@/shared/lib/player-input'
import { focusPlayerWindow } from '@/shared/lib/player-window-focus'
import { Button } from '@/shared/ui/button'
import { FocusGroup } from '@/shared/ui/focus'
import { IconPause, IconPlay, IconFullscreen } from '@/shared/ui/icons'
import { BackButton } from '@/shared/ui/back-button'

/** Switching channels replaces the route; keying by channel recreates the screen and its view-model. */
export function ChannelPlayerScreen() {
  const { id = '0' } = useParams()

  return <ChannelPlayerContent key={id} channelId={Number(id)} />
}

const ChannelPlayerContent = observer(function ChannelPlayerContent({ channelId }: { channelId: number }) {
  const { ui } = useServices()
  const vm = useViewModel((services) => new ChannelPlayerScreenViewModel(services, channelId))
  const channel = vm.channel
  const surfaceClicks = usePlayerClicks(vm.onSurfaceClick, ui.toggleFullscreen)
  const onPointerMove = (event: MouseEvent<HTMLDivElement>) => {
    vm.showHud()
    if (!isPlayerSurface(event.target, event.currentTarget) || vm.error) return

    if (getCurrentFocusKey() !== 'CHANNEL-pause') setFocus('CHANNEL-pause')

    focusPlayerWindow(event.currentTarget)
  }

  useEffect(() => {
    if (!vm.hudVisible || vm.error) return

    const frame = requestAnimationFrame(() => setFocus('CHANNEL-pause'))

    return () => cancelAnimationFrame(frame)
  }, [vm.hudVisible, vm.error, channel?.id])

  return (
    <div
      className={cx(styles.player, (vm.hudVisible || vm.error) && styles.cursorVisible)}
      tabIndex={-1}
      onMouseMove={onPointerMove}
      onMouseEnter={onPointerMove}
      {...surfaceClicks}
    >
      {channel && (
        <video
          ref={vm.attach}
          autoPlay
          playsInline
          onPlay={vm.onPlay}
          onPause={vm.onPause}
          onPlaying={vm.onPlaying}
          onError={vm.onVideoError}
        />
      )}
      {vm.loading && !vm.error && (
        <div className={styles.playerCenter}>
          <Spinner />
        </div>
      )}
      {vm.error && (
        <div className={styles.playerError}>
          <h3>{channel?.title}</h3>
          <p>{vm.error}</p>
        </div>
      )}
      <div className={cx(styles.playerHud, vm.hudVisible && styles.isVisible)} data-player-surface>
        <div className={styles.playerHead}>
          <div className={styles.playerTitle}>{channel?.title}</div>
          {channel?.current && <div className={styles.playerSubtitle}>{channel.current}</div>}
        </div>
        <div className={styles.playerDock}>
          <FocusGroup focusKey="CHANNEL-controls" className={styles.playerErrorActions} isFocusBoundary>
            <Button focusKey="CHANNEL-pause" icon={vm.playing ? <IconPause /> : <IconPlay />} onPress={vm.togglePlay}>
              {vm.playing ? 'Пауза' : 'Продолжить'}
            </Button>
            <div className={styles.playerFullscreen}>
              <Button focusKey="CHANNEL-fullscreen" icon={<IconFullscreen />} onPress={ui.toggleFullscreen}>
                Полный экран
              </Button>
            </div>
          </FocusGroup>
          <div className={styles.playerHint}>
            Канал {vm.index + 1} из {vm.list.length}. Вверх и вниз на пульте переключают каналы.
          </div>
        </div>
      </div>
      <div className={cx(styles.playerTopbar, (vm.hudVisible || vm.error) && styles.isVisible)}>
        <BackButton focusKey="CHANNEL-exit" />
      </div>
    </div>
  )
})
