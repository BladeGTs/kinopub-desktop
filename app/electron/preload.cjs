const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  runtime: {
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    appVersion: process.argv.find((arg) => arg.startsWith('--kinopub-version='))?.slice('--kinopub-version='.length),
  },
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  getProxy: () => ipcRenderer.invoke('proxy:get'),
  setProxy: (config) => ipcRenderer.invoke('proxy:set', config),
})
