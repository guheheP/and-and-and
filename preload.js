// preload.js — Electron プリロードスクリプト
// メインプロセスからのIPC通信をレンダラーに安全に橋渡し

const { contextBridge, ipcRenderer } = require('electron');

const isDevMode = process.argv.includes('--dev');

contextBridge.exposeInMainWorld('electronAPI', {
  isDevMode,
  onWindowBlur: (callback) => ipcRenderer.on('window-blur', callback),
  onWindowFocus: (callback) => ipcRenderer.on('window-focus', callback),
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  resize: (width, height) => ipcRenderer.send('window-resize', width, height),
  isElectron: true,
  // 自動アップデート
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, version) => callback(version)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, version) => callback(version)),
  installUpdate: () => ipcRenderer.send('install-update'),
  checkForUpdate: () => ipcRenderer.send('check-for-update'),
});
