// electron-main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

async function createWindow() {
  // Dynamically import electron-is-dev
  const { default: isDev } = await import('electron-is-dev');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // No preload script needed for the simulated terminal
    },
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // Electron will always load from the Next.js server (dev or prod) on port 9002
  const startUrl = 'http://localhost:9002';

  win.loadURL(startUrl);

  if (isDev) {
    win.webContents.openDevTools();
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
