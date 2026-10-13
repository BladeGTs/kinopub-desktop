function zoomForSize(width, height) {
  return Math.max(0.1, Math.min(width / 1920, height / 1080))
}

function canNavigate(destination, entry, development) {
  try {
    const target = new URL(destination)
    const source = new URL(entry)

    return development
      ? target.origin === source.origin
      : target.protocol === 'file:' && target.host === source.host && target.pathname === source.pathname && target.search === source.search
  } catch {
    return false
  }
}

function externalUrl(value) {
  try {
    const url = new URL(value)

    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

module.exports = { zoomForSize, canNavigate, externalUrl }
