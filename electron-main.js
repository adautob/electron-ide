
// electron-main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

async function createWindow() {
  // Dynamically import electron-is-dev
  const { default: isDev } = await import('electron-is-dev');

  const win = new BrowserWindow({
    width: 1280, // Largura um pouco maior para acomodar melhor o IDE
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Mantenha false por segurança
      contextIsolation: true, // Mantenha true por segurança
      // preload: path.join(__dirname, 'preload.js') // Opcional: para comunicação IPC segura, não incluído neste passo
    },
    icon: path.join(__dirname, 'public/favicon.ico') // Tentativa de adicionar um ícone
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
