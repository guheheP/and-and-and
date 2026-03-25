// preload.js — Electron プリロードスクリプト
// メインプロセスからのIPC通信をレンダラーに安全に橋渡し

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onWindowBlur: (callback) => ipcRenderer.on('window-blur', callback),
  onWindowFocus: (callback) => ipcRenderer.on('window-focus', callback),
  isElectron: true,
});
