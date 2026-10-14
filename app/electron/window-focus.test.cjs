const { test } = require('node:test')
const assert = require('node:assert/strict')
const { focusPlayerWindow } = require('./window-focus.cjs')

function fixture() {
  const calls = []
  let focused = false

  return {
    calls,
    app: { focus: (options) => calls.push(options) },
    window: {
      isDestroyed: () => false,
      isMinimized: () => false,
      isVisible: () => true,
      getBounds: () => ({ x: -1920, y: 0, width: 1280, height: 720 }),
      isFocused: () => focused,
      focus: () => {
        calls.push('window')
        focused = true
      },
      webContents: { focus: () => calls.push('contents') },
    },
  }
}

test('hover activates an inactive window on another monitor and its keyboard input', () => {
  const { window, app, calls } = fixture()

  assert.equal(focusPlayerWindow(window, app, { x: -1500, y: 300 }, 'win32'), true)
  assert.deepEqual(calls, ['window', 'contents'])
})

test('macOS activates the application as well as its window', () => {
  const { window, app, calls } = fixture()

  assert.equal(focusPlayerWindow(window, app, { x: -1500, y: 300 }, 'darwin'), true)
  assert.deepEqual(calls, [{ steal: true }, 'window', 'contents'])
})

test('hover never activates hidden/minimized windows or a window away from the cursor', () => {
  for (const flag of ['isDestroyed', 'isMinimized', 'isVisible', 'outside']) {
    const { window, app, calls } = fixture()

    if (flag === 'isVisible') window.isVisible = () => false
    else if (flag !== 'outside') window[flag] = () => true

    assert.equal(focusPlayerWindow(window, app, { x: flag === 'outside' ? 200 : -1500, y: 300 }), false)
    assert.deepEqual(calls, [])
  }
})
