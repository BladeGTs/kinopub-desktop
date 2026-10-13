const { test } = require('node:test')
const assert = require('node:assert/strict')
const { normalizeProxy, chromiumProxy, createProxyController } = require('./proxy.cjs')

const manual = { mode: 'manual', protocol: 'http', host: '127.0.0.1', port: 8080, username: '', password: '' }

test('accepts a single proxy endpoint and rejects malformed rules and SOCKS credentials', () => {
  assert.equal(normalizeProxy({ ...manual, host: ' localhost ' }).host, 'localhost')
  for (const change of [
    { host: 'http://example.com' },
    { host: 'x;DIRECT' },
    { host: 'x/path' },
    { port: 0 },
    { port: 65536 },
    { port: 1.5 },
    { protocol: 'pac' },
    { mode: 'other' },
    { protocol: 'socks5', username: 'u' },
  ]) {
    assert.throws(() => normalizeProxy({ ...manual, ...change }))
  }

  assert.equal(chromiumProxy(manual).proxyRules, 'http://127.0.0.1:8080')
  assert.deepEqual(chromiumProxy({ mode: 'system' }), { mode: 'system' })
  assert.deepEqual(chromiumProxy({ mode: 'direct' }), { mode: 'direct' })
  assert.equal(chromiumProxy({ ...manual, protocol: 'socks5' }).proxyRules, 'socks5://127.0.0.1:8080')
})

function fixture() {
  const files = new Map()
  const calls = []
  const session = {
    setProxy: async (config) => {
      calls.push(config)
    },
    closeAllConnections: async () => {
      calls.push('close')
    },
    clearAuthCache: async () => {
      calls.push('clear-auth')
    },
  }
  const secure = {
    isEncryptionAvailable: () => true,
    encryptString: (s) => Buffer.from(`encrypted:${s}`),
    decryptString: (b) => b.toString().slice(10),
  }
  const io = {
    existsSync: (p) => files.has(p),
    readFileSync: (p) => files.get(p),
    writeFileSync: (p, data) => files.set(p, data),
    renameSync: (from, to) => {
      files.set(to, files.get(from))
      files.delete(from)
    },
  }
  const create = () => createProxyController(session, '/profile/proxy.json', secure, io)

  return { files, calls, session, secure, io, create }
}

test('encrypts passwords, hides them from renderer and restores proxy on startup', async () => {
  const f = fixture()
  const controller = f.create()

  await controller.initialize()
  const saved = await controller.apply({ ...manual, username: 'alice', password: 'secret-test' })

  assert.equal(saved.hasPassword, true)
  assert.equal(saved.password, '')
  assert.ok(!f.files.get('/profile/proxy.json').includes('secret-test'))
  const restored = f.create()

  await restored.initialize()
  assert.equal(restored.get().hasPassword, true)
  assert.deepEqual(restored.credentialsFor({ isProxy: true, host: '127.0.0.1', port: 8080 }), {
    username: 'alice',
    password: 'secret-test',
  })
  assert.equal(restored.credentialsFor({ isProxy: false, host: '127.0.0.1', port: 8080 }), null)
  assert.equal(restored.credentialsFor({ isProxy: true, host: 'other', port: 8080 }), null)
  assert.equal(restored.credentialsFor({ isProxy: true, host: '127.0.0.1', port: 80 }), null)
})

test('keeps an unchanged saved password, clears it explicitly and does not reuse it for another host', async () => {
  const f = fixture()
  const controller = f.create()

  await controller.apply({ ...manual, username: 'alice', password: 'secret-test' })
  await controller.apply({ ...manual, username: 'alice' })
  assert.equal(controller.get().hasPassword, true)
  await controller.apply({ ...manual, username: 'alice', clearPassword: true })
  assert.equal(controller.get().hasPassword, false)
  await controller.apply({ ...manual, username: 'alice', password: 'secret-test' })
  await controller.apply({ ...manual, username: 'alice', host: 'localhost' })
  assert.equal(controller.get().hasPassword, false)
})

test('rejects credential storage without encryption and rolls network back when writing fails', async () => {
  const f = fixture()

  f.secure.isEncryptionAvailable = () => false
  const controller = f.create()

  await assert.rejects(controller.apply({ ...manual, username: 'alice', password: 'secret-test' }))
  assert.equal(controller.get().mode, 'system')
  await controller.apply(manual)
  assert.equal(controller.get().mode, 'manual')
  assert.equal(f.calls.at(-1), 'clear-auth')
  f.io.writeFileSync = () => {
    throw new Error('disk unavailable')
  }

  await assert.rejects(controller.apply({ mode: 'direct' }), /disk unavailable/)
  assert.equal(controller.get().mode, 'manual')
  assert.equal(f.calls.findLast((call) => typeof call === 'object').proxyRules, 'http://127.0.0.1:8080')
})
