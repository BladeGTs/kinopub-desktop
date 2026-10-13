const fs = require('node:fs')

const defaults = () => ({ mode: 'system', protocol: 'http', host: '', port: 8080, username: '', password: '' })
const proxyHost = (value) =>
  String(value)
    .toLowerCase()
    .replace(/^\[|\]$/g, '')

function normalizeProxy(input) {
  if (!input || !['system', 'direct', 'manual'].includes(input.mode)) throw new Error('Выберите режим подключения')
  if (input.mode !== 'manual') return { ...defaults(), mode: input.mode }
  if (!['http', 'socks5'].includes(input.protocol)) throw new Error('Выберите HTTP или SOCKS5')

  const host = typeof input.host === 'string' ? input.host.trim() : ''
  const port = Number(input.port)

  if (!host || /[\s;/@?#,\\]/.test(host) || host.includes('://')) throw new Error('Введите только имя сервера или IP, без протокола и пути')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Порт должен быть числом от 1 до 65535')

  let parsed

  try {
    parsed = new URL(`${input.protocol === 'http' ? 'http' : 'socks5'}://${host}:${port}`)
  } catch {
    throw new Error('Некорректный адрес прокси')
  }

  if (
    parsed.hostname !== host.toLowerCase() ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== (input.protocol === 'http' ? '/' : '')
  )
    throw new Error('Некорректное имя сервера прокси')

  const username = input.username ?? ''
  const password = input.password ?? ''

  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 512 || password.length > 4096)
    throw new Error('Некорректный логин или пароль')
  if (input.protocol === 'socks5' && (username || password))
    throw new Error('SOCKS5 поддерживается без логина и пароля. Для авторизации используйте HTTP-прокси')

  return { mode: 'manual', protocol: input.protocol, host: parsed.hostname, port, username, password }
}

function chromiumProxy(config) {
  if (config.mode !== 'manual') return { mode: config.mode }

  return {
    mode: 'fixed_servers',
    proxyRules: `${config.protocol}://${config.host}:${config.port}`,
    proxyBypassRules: 'localhost;127.0.0.1;[::1]',
  }
}

function createProxyController(session, file, secure, io = fs) {
  let current = defaults()
  let pending = null
  let queue = Promise.resolve()
  const get = () => ({ ...current, password: '', hasPassword: !!current.password })
  const protect = (password) => {
    if (!secure.isEncryptionAvailable() || secure.getSelectedStorageBackend?.() === 'basic_text')
      throw new Error('Защищённое хранилище недоступно. Используйте прокси без пароля или настройте системное хранилище ключей')

    return secure.encryptString(password).toString('base64')
  }

  const initialize = async () => {
    if (io.existsSync(file)) {
      const saved = JSON.parse(io.readFileSync(file, 'utf8'))
      const password = saved.encryptedPassword ? secure.decryptString(Buffer.from(saved.encryptedPassword, 'base64')) : ''

      current = normalizeProxy({ ...saved, password })
    }

    await session.setProxy(chromiumProxy(current))
  }

  const apply = (input) => {
    const operation = queue
      .catch(() => {})
      .then(async () => {
        const next = normalizeProxy(input)
        const sameEndpoint = ['mode', 'protocol', 'host', 'port', 'username'].every((key) => next[key] === current[key])

        if (sameEndpoint && !next.password && !input.clearPassword) next.password = current.password

        const { password, ...saved } = next
        const serialized = JSON.stringify({ ...saved, encryptedPassword: password ? protect(password) : '' })

        pending = next
        try {
          await session.setProxy(chromiumProxy(next))
          await session.closeAllConnections()
          await session.clearAuthCache()
          io.writeFileSync(`${file}.tmp`, serialized, { encoding: 'utf8', mode: 0o600 })
          io.renameSync(`${file}.tmp`, file)
        } catch (error) {
          pending = null
          await session.setProxy(chromiumProxy(current))
          await session.closeAllConnections()
          await session.clearAuthCache()
          throw error
        } finally {
          pending = null
        }

        current = next

        return get()
      })

    queue = operation

    return operation
  }

  const credentialsFor = (auth) => {
    const config = pending ?? current

    if (
      !auth.isProxy ||
      config.mode !== 'manual' ||
      config.protocol !== 'http' ||
      !config.username ||
      proxyHost(auth.host) !== proxyHost(config.host) ||
      Number(auth.port) !== config.port
    )
      return null

    return { username: config.username, password: config.password }
  }

  return { get, initialize, apply, credentialsFor }
}

module.exports = { normalizeProxy, chromiumProxy, createProxyController }
