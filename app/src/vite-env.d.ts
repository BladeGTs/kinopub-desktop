/// <reference types="vite/client" />
import type { ProxyConfig, ProxyResult } from './shared/lib/proxy-types'

declare global {
  const __APP_VERSION__: string

  interface Window {
    desktop?: {
      runtime?: { platform: string; arch: string; electron: string; appVersion?: string }
      toggleFullscreen: () => Promise<boolean>
      focusPlayerWindow?: () => Promise<boolean>
      copyDeviceCode?: (code: string) => Promise<boolean>
      getProxy?: () => Promise<ProxyConfig>
      setProxy?: (config: ProxyConfig) => Promise<ProxyResult>
    }
  }
}
