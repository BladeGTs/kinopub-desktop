import { observer } from 'mobx-react-lite'
import { Outlet } from 'react-router'
import { PairScreen } from '@/features/pair'
import { useViewModel } from '@/shared/view-model/use-view-model'
import { Backdrop } from './backdrop/backdrop'
import { LayoutViewModel } from './layout.view-model'
import { Rail } from './rail/rail'
import { Toast } from './toast/toast'
import { Spinner } from '@/shared/ui/spinner'
import { BackButton } from '@/shared/ui/back-button'
import styles from './layout.module.css'

export const Layout = observer(function Layout() {
  const vm = useViewModel((services) => new LayoutViewModel(services))

  if (vm.authStatus === 'checking') {
    return <Spinner centered />
  }
  if (vm.authStatus === 'pairing') return <PairScreen />

  return (
    <>
      {!vm.isFullscreen && <Backdrop />}
      {!vm.isFullscreen && <Rail />}
      {vm.showBack && (
        <div className={styles.back}>
          <BackButton focusKey="APP-back" />
        </div>
      )}
      <Outlet />
      <Toast />
    </>
  )
})
