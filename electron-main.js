// electron-main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');

let mainWindow;

async function createWindow() {
  const { default: isDev } = await import('electron-is-dev');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // Point to the preload script
    },
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  const startUrl = 'http://localhost:9002';
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
