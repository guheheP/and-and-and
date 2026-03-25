// preload.js — Electron プリロードスクリプト
// メインプロセスからのIPC通信をレンダラーに安全に橋渡し

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onWindowBlur: (callback) => ipcRenderer.on('window-blur', callback),
  onWindowFocus: (callback) => ipcRenderer.on('window-focus', callback),
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  resize: (width, height) => ipcRenderer.send('window-resize', width, height),
  isElectron: true,
});
