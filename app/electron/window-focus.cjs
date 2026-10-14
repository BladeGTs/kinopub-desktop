/** Activate only a visible player window that the OS cursor is actually over. */
function focusPlayerWindow(window, app, point, platform = process.platform) {
  if (!window || window.isDestroyed() || window.isMinimized() || !window.isVisible()) return false

  const bounds = window.getBounds()

  if (point.x < bounds.x || point.y < bounds.y || point.x >= bounds.x + bounds.width || point.y >= bounds.y + bounds.height) return false

  if (!window.isFocused()) {
    if (platform === 'darwin') app.focus({ steal: true })

    window.focus()
  }

  window.webContents.focus()

  return window.isFocused()
}

module.exports = { focusPlayerWindow }
