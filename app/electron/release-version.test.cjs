const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

test('release tags are validated before any version files are changed', async () => {
  const { releaseVersion, setReleaseVersion } = await import('../../scripts/set-release-version.mjs')

  assert.equal(releaseVersion('v2.3.4'), '2.3.4')
  assert.equal(releaseVersion('2.3.4'), '2.3.4')
  for (const value of ['vnext', 'v1.2', 'v01.2.3', 'v1.2.3-1', 'v1.2.3;echo bad', undefined]) {
    assert.throws(() => setReleaseVersion(value, '/missing-root'), /Expected a release version/)
  }
})

test('one tag stamps the desktop, webOS and package versions without a Debian revision', async () => {
  const { setReleaseVersion } = await import('../../scripts/set-release-version.mjs')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kinopub-release-version-'))

  try {
    fs.mkdirSync(path.join(root, 'app/webos'), { recursive: true })
    fs.writeFileSync(path.join(root, 'app/package.json'), '{"name":"kinopub-tv","version":"0.0.0"}')
    fs.writeFileSync(path.join(root, 'app/webos/appinfo.json'), '{"id":"ru.vrnn.kinopub","version":"1.0.0"}')
    fs.writeFileSync(path.join(root, 'app/electron-builder.yml'), 'extraMetadata:\n  version: 1.0.0\nlinux:\n  target: deb\n')
    assert.equal(setReleaseVersion('v2.3.4', root), '2.3.4')
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'app/package.json'))).version, '2.3.4')
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'app/webos/appinfo.json'))).version, '2.3.4')
    assert.equal(
      fs.readFileSync(path.join(root, 'app/electron-builder.yml'), 'utf8'),
      'extraMetadata:\n  version: 2.3.4\nlinux:\n  target: deb\n',
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
