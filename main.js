// Electron メインプロセス
// 透過・最前面固定・非アクティブUI非表示

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 210,
    height: 220,
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
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    // 現在の高さと新しい高さの差分だけY座標を上にずらす
    const diffY = height - bounds.height;
    mainWindow.setBounds({
      x: bounds.x,
      y: bounds.y - diffY,
      width: width,
      height: height
    });
  }
});

// ============================================
//  自動アップデート
// ============================================

function setupAutoUpdater() {
  // 開発時はスキップ
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info.version);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info.version);
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err.message);
  });

  // 起動後に更新チェック
  autoUpdater.checkForUpdates().catch(() => {});
}

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.on('check-for-update', () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(() => {});
  }
});

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

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
