const { app, BrowserWindow, Menu, dialog, shell, ipcMain, session, safeStorage, screen, clipboard } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { zoomForSize, canNavigate, externalUrl } = require('./window-policy.cjs')
const { createProxyController } = require('./proxy.cjs')
const { focusPlayerWindow } = require('./window-focus.cjs')

const development = !app.isPackaged && process.argv.includes('--dev')
const entry = development ? 'http://127.0.0.1:5173/' : pathToFileURL(path.join(__dirname, '../dist/index.html')).href
let mainWindow
let proxy

function trusted(event) {
  return (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  )
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 640,
    minHeight: 400,
    backgroundColor: '#000000',
    title: 'Кинопаб',
    icon: path.join(__dirname, 'icons/icon.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      additionalArguments: [`--kinopub-version=${app.getVersion()}`],
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })
  const window = mainWindow
  const contents = window.webContents
  const fit = () => {
    if (window.isDestroyed() || contents.isDestroyed()) return

    const [width, height] = window.getContentSize()

    contents.setZoomFactor(zoomForSize(width, height))
  }

  contents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  contents.session.setPermissionCheckHandler(() => false)
  contents.setWindowOpenHandler(({ url }) => {
    const external = externalUrl(url)

    if (external) shell.openExternal(external).catch(() => {})

    return { action: 'deny' }
  })
  contents.on('will-navigate', (event, url) => {
    if (!canNavigate(url, entry, development)) event.preventDefault()
  })
  contents.on('will-redirect', (event, url) => {
    if (!canNavigate(url, entry, development)) event.preventDefault()
  })
  contents.on('will-attach-webview', (event) => event.preventDefault())
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    if (input.key === 'F11' || (process.platform === 'darwin' && input.control && input.meta && input.key.toLowerCase() === 'f')) {
      event.preventDefault()
      window.setFullScreen(!window.isFullScreen())
    }
  })
  contents.on('did-finish-load', () => {
    fit()
    contents
      .insertCSS(
        'html { width: 100% !important; height: 100% !important; display: flex; align-items: center; justify-content: center; } body { flex-shrink: 0; }',
      )
      .catch(() => {})
  })
  window.on('resize', fit)
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    mainWindow = null
  })
  window.loadURL(entry).catch((error) => {
    dialog.showErrorBox('Не удалось запустить Кинопаб', error.message)
    app.quit()
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()

    mainWindow.show()
    mainWindow.focus()
  })
  app.whenReady().then(async () => {
    proxy = createProxyController(session.defaultSession, path.join(app.getPath('userData'), 'proxy-settings.json'), safeStorage)
    try {
      await proxy.initialize()
    } catch {
      dialog.showErrorBox('Настройки прокси', 'Не удалось загрузить сохранённые настройки прокси. Проверьте их на экране входа.')
      proxy = createProxyController(session.defaultSession, path.join(app.getPath('userData'), 'proxy-settings.json'), safeStorage)
      await session.defaultSession.setProxy({ mode: 'system' })
    }

    ipcMain.handle('proxy:get', (event) => {
      if (!trusted(event)) throw new Error('Доступ запрещён')

      return proxy.get()
    })
    ipcMain.handle('proxy:set', async (event, config) => {
      if (!trusted(event)) throw new Error('Доступ запрещён')

      try {
        return { ok: true, config: await proxy.apply(config) }
      } catch (error) {
        return { ok: false, error: error.message || 'Не удалось применить прокси' }
      }
    })
    app.on('login', (event, contents, details, authInfo, callback) => {
      if (contents && contents.session !== session.defaultSession) return

      const credentials = proxy.credentialsFor(authInfo)

      if (!credentials) return

      event.preventDefault()
      if (details.firstAuthAttempt === false) callback()
      else callback(credentials.username, credentials.password)
    })
    ipcMain.handle('window:focus-player', (event) => {
      if (!trusted(event)) return false

      return focusPlayerWindow(mainWindow, app, screen.getCursorScreenPoint())
    })
    ipcMain.handle('clipboard:copy-device-code', (event, code) => {
      if (!trusted(event) || typeof code !== 'string' || !code.length || code.length > 128 || /[\r\n\0]/.test(code)) return false

      clipboard.writeText(code)

      return true
    })
    ipcMain.handle('window:toggle-fullscreen', (event) => {
      if (!trusted(event)) return false

      mainWindow.setFullScreen(!mainWindow.isFullScreen())

      return mainWindow.isFullScreen()
    })
    Menu.setApplicationMenu(
      process.platform === 'darwin'
        ? Menu.buildFromTemplate([
            { role: 'appMenu' },
            { role: 'editMenu' },
            { label: 'Окно', submenu: [{ role: 'togglefullscreen' }, { role: 'minimize' }, { role: 'close' }] },
          ])
        : null,
    )
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
