import { observer } from 'mobx-react-lite'
import { List } from '@/shared/ui/list'
import { PageTitle } from '@/shared/ui/page-title'
import { Page } from '@/shared/ui/page'
import { useViewModel } from '@/shared/view-model/use-view-model'
import { DeviceSettings } from './device-settings/device-settings'
import { Setting } from './setting/setting'
import { SettingSelect } from './setting/setting-select'
import { QUALITY_OPTIONS, STREAM_OPTIONS, SettingsScreenViewModel } from './settings-screen.view-model'
import styles from './settings-screen.module.css'
import { ProxySettings } from '@/features/proxy'

export const SettingsScreen = observer(function SettingsScreen() {
  const vm = useViewModel((services) => new SettingsScreenViewModel(services))
  const v = vm.values

  return (
    <Page focusKey="PAGE-settings" initialFocusKey="SET-quality">
      <PageTitle>Настройки</PageTitle>
      {vm.subscriptionLine && <div className={styles.settingsUser}>{vm.subscriptionLine}</div>}
      <List focusKey="SETTINGS">
        <SettingSelect
          focusKey="SET-quality"
          name="Качество видео"
          description="Лучшее доступное или фиксированное"
          value={v.quality}
          options={QUALITY_OPTIONS}
          onSelect={vm.selectQuality}
        />
        <SettingSelect
          focusKey="SET-stream"
          name="Тип потока"
          description={vm.stream.description}
          value={v.stream}
          options={STREAM_OPTIONS}
          onSelect={vm.selectStream}
        />
        <DeviceSettings />
        <Setting
          name="Субтитры по умолчанию"
          description="Включать русские субтитры при запуске"
          checked={v.subtitlesByDefault}
          onPress={() => vm.toggle('subtitlesByDefault')}
        />
        <Setting
          name="Автозапуск следующей серии"
          description="На титрах начинается отсчёт, затем включается следующая серия"
          checked={v.autoplayNext}
          onPress={() => vm.toggle('autoplayNext')}
        />
        <Setting
          name="Трейлер на странице фильма"
          description="Через пару секунд за описанием без звука пойдёт трейлер"
          checked={v.trailerPreview}
          onPress={() => vm.toggle('trailerPreview')}
        />
        <Setting name="Скрыть ряд «Продолжить» на главной" checked={v.hideContinueRow} onPress={() => vm.toggle('hideContinueRow')} />
        <SettingSelect
          focusKey="SET-host"
          name="Сервер API"
          description="Автоматически: первый отвечающий из списка"
          value={v.apiHost}
          options={vm.hostOptions}
          onSelect={vm.selectHost}
        />
        <ProxySettings />
        <Setting name="Выйти из аккаунта" description="Понадобится заново ввести код устройства" value="" onPress={vm.logout} />
      </List>
      <div className={styles.settingsVersion}>KinoPub Desktop {vm.version}</div>
    </Page>
  )
})
