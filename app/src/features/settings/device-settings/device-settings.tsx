import { observer } from 'mobx-react-lite'
import { useViewModel } from '@/shared/view-model/use-view-model'
import { Setting } from '../setting/setting'
import { SettingSelect } from '../setting/setting-select'
import { DeviceSettingsViewModel } from './device-settings.view-model'

export const DeviceSettings = observer(function DeviceSettings() {
  const vm = useViewModel((services) => new DeviceSettingsViewModel(services))

  if (!vm.settings) return null

  return (
    <>
      <SettingSelect
        focusKey="SET-server"
        name="Сервер раздачи"
        description="Откуда идёт видео. Если подтормаживает — попробуйте другой"
        value={String(vm.server?.id ?? '')}
        options={vm.servers.map((server) => ({ id: String(server.id), title: server.label, description: server.description }))}
        onSelect={(value) => vm.selectServer(Number(value))}
      />
      <Setting
        name="HEVC (H.265)"
        description="Меньше трафика при том же качестве. Выключите, если видео не воспроизводится"
        checked={vm.isOn('supportHevc')}
        onPress={() => vm.toggle('supportHevc')}
      />
      <Setting
        name="HDR"
        description="Расширенный цвет и яркость в фильмах, где он есть"
        checked={vm.isOn('supportHdr')}
        onPress={() => vm.toggle('supportHdr')}
      />
      <Setting name="4K" description="Отдавать 2160p, где оно есть" checked={vm.isOn('support4k')} onPress={() => vm.toggle('support4k')} />
    </>
  )
})
