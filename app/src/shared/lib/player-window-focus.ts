const pending = new WeakSet<HTMLElement>()
const attemptedAt = new WeakMap<HTMLElement, number>()

export function focusPlayerWindow(surface: HTMLElement) {
  if (document.activeElement !== surface) surface.focus({ preventScroll: true })

  const activate = window.desktop?.focusPlayerWindow

  if (!activate || document.hasFocus() || pending.has(surface)) return

  const now = performance.now()

  if (now - (attemptedAt.get(surface) ?? -Infinity) < 250) return

  attemptedAt.set(surface, now)
  pending.add(surface)
  void activate()
    .then((focused) => {
      if (focused && surface.isConnected && document.activeElement === surface) surface.focus({ preventScroll: true })
    })
    .catch(() => {})
    .finally(() => pending.delete(surface))
}
