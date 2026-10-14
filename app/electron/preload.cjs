const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  runtime: {
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    appVersion: process.argv.find((arg) => arg.startsWith('--kinopub-version='))?.slice('--kinopub-version='.length),
  },
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  focusPlayerWindow: () => ipcRenderer.invoke('window:focus-player'),
  copyDeviceCode: (code) => ipcRenderer.invoke('clipboard:copy-device-code', code),
  getProxy: () => ipcRenderer.invoke('proxy:get'),
  setProxy: (config) => ipcRenderer.invoke('proxy:set', config),
})
