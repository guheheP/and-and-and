// Electron メインプロセス
// 透過・最前面固定・非アクティブUI非表示

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 240,
    height: 210,
    useContentSize: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // フルスクリーンアプリや新規ウィンドウよりも更に手前に強制する
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // 非アクティブ時にUI非表示
  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-blur');
  });

  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 開発モードではDevToolsを開く
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// IPC ハンドラ
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-resize', (event, width, height) => {
  if (mainWindow) mainWindow.setContentSize(width, height);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
