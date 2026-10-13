export async function toggleFullscreen() {
  if (window.desktop) {
    await window.desktop.toggleFullscreen()

    return
  }

  if (document.fullscreenElement) await document.exitFullscreen()
  else await document.documentElement.requestFullscreen?.()
}
