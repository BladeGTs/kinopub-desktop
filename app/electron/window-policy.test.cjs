const assert = require('node:assert/strict')
const { test } = require('node:test')
const { zoomForSize, canNavigate, externalUrl } = require('./window-policy.cjs')

test('fits the whole 1920×1080 interface into small, wide and tall windows', () => {
  assert.equal(zoomForSize(1280, 720), 2 / 3)
  assert.equal(zoomForSize(1920, 800), 800 / 1080)
  assert.equal(zoomForSize(900, 1080), 900 / 1920)
  assert.equal(zoomForSize(3840, 2160), 2)
  assert.equal(zoomForSize(0, 0), 0.1)
})

test('packaged renderer cannot navigate to another file or a remote origin', () => {
  const entry = 'file:///C:/app/dist/index.html'

  assert.equal(canNavigate(`${entry}#settings`, entry, false), true)
  assert.equal(canNavigate('file:///C:/app/secrets.txt', entry, false), false)
  assert.equal(canNavigate('https://example.com', entry, false), false)
  assert.equal(canNavigate('not a URL', entry, false), false)
})

test('development navigation stays on the exact local server origin', () => {
  const entry = 'http://127.0.0.1:5173/'

  assert.equal(canNavigate(`${entry}settings`, entry, true), true)
  assert.equal(canNavigate('http://127.0.0.1:5174/', entry, true), false)
  assert.equal(canNavigate('https://example.com/', entry, true), false)
})

test('only HTTPS links without embedded credentials may open externally', () => {
  assert.equal(externalUrl('https://kino.pub/device'), 'https://kino.pub/device')
  for (const url of [
    'file:///C:/Windows/system32/cmd.exe',
    'javascript:alert(1)',
    'http://example.com',
    'https://u:p@example.com',
    'invalid',
  ]) {
    assert.equal(externalUrl(url), null)
  }
})
