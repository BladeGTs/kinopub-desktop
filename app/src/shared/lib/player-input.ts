export function isPlayerSurface(target: EventTarget | null, root: HTMLElement) {
  return target === root || (target instanceof HTMLElement && (target.tagName === 'VIDEO' || target.hasAttribute('data-player-surface')))
}

export function isSpaceShortcut(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return false
  if (
    event.target instanceof HTMLElement &&
    event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
  )
    return false

  return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar' || event.keyCode === 32
}
