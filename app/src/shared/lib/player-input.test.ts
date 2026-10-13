import { expect, it } from 'vitest'
import { isPlayerSurface, isSpaceShortcut } from './player-input'

it('accepts video and empty surface clicks but excludes controls and text', () => {
  const root = document.createElement('div')
  const backdrop = document.createElement('div')

  backdrop.dataset.playerSurface = ''
  expect(isPlayerSurface(root, root)).toBe(true)
  expect(isPlayerSurface(document.createElement('video'), root)).toBe(true)
  expect(isPlayerSurface(backdrop, root)).toBe(true)
  expect(isPlayerSurface(document.createElement('button'), root)).toBe(false)
  expect(isPlayerSurface(document.createElement('span'), root)).toBe(false)
})

it('recognises Space without intercepting typing in editable fields', () => {
  expect(isSpaceShortcut(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }))).toBe(true)
  expect(isSpaceShortcut(new KeyboardEvent('keydown', { key: 'Spacebar' }))).toBe(true)
  expect(isSpaceShortcut(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false)
  const input = document.createElement('input')

  expect(isSpaceShortcut({ key: ' ', target: input } as unknown as KeyboardEvent)).toBe(false)
})
