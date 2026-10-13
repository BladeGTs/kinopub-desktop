export const RemoteKey = {
  Back: 461,
  Enter: 13,
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40,
  Play: 415,
  Pause: 19,
  PlayPause: 10252,
  Stop: 413,
  FastForward: 417,
  Rewind: 412,
  ChannelUp: 33,
  ChannelDown: 34,
  Red: 403,
  Green: 404,
  Yellow: 405,
  Blue: 406,
} as const

export type KeyHandler = (event: KeyboardEvent) => boolean | void
export type BackHandler = () => boolean | void

export class RemoteService {
  private readonly stack: { key: KeyHandler; back?: BackHandler }[] = []

  constructor() {
    window.addEventListener('keydown', this.onKeyDown, true)
  }

  push(handler: KeyHandler, back?: BackHandler): () => void {
    const entry = { key: handler, back }

    this.stack.push(entry)

    return () => {
      const index = this.stack.lastIndexOf(entry)

      if (index >= 0) this.stack.splice(index, 1)
    }
  }

  pushBack(handler: BackHandler): () => void {
    return this.push((event) => (RemoteService.isBack(event) ? handler() : false), handler)
  }

  static isBack(event: KeyboardEvent) {
    if (event.keyCode === RemoteKey.Back || event.key === 'GoBack' || event.key === 'Escape') return true

    return event.key === 'Backspace' && !isTextInput(event.target)
  }

  /** A semantic action: no keyboard event is created or dispatched. */
  back = () => {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].back?.() === true) return
    }
  }

  private onKeyDown = (event: KeyboardEvent) => {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const entry = this.stack[i]
      const handled = RemoteService.isBack(event) && entry.back ? entry.back() : entry.key(event)

      if (handled === true) {
        event.preventDefault()
        event.stopPropagation()

        return
      }
    }
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown, true)
  }
}

function isTextInput(target: EventTarget | null) {
  const tag = (target as HTMLElement | null)?.tagName

  return tag === 'INPUT' || tag === 'TEXTAREA'
}
