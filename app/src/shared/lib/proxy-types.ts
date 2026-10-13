export interface ProxyConfig {
  mode: 'system' | 'direct' | 'manual'
  protocol: 'http' | 'socks5'
  host: string
  port: number
  username: string
  password: string
  hasPassword?: boolean
  clearPassword?: boolean
}

export type ProxyResult = { ok: true; config: ProxyConfig } | { ok: false; error: string }
