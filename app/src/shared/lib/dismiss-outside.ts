interface OutsideEvent {
  target: EventTarget | null
  currentTarget: EventTarget
  preventDefault: () => void
  stopPropagation: () => void
}

export function dismissOutside(event: OutsideEvent, close: () => void) {
  if (event.target !== event.currentTarget) return

  event.preventDefault()
  event.stopPropagation()
  close()
}
