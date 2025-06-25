// electron-main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const pty = require('node-pty');

// Determine the correct shell for the OS
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

async function createWindow() {
  const { default: isDev } = await import('electron-is-dev');

  const win = new BrowserWindow({
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
  win.loadURL(startUrl);

  if (isDev) {
    win.webContents.openDevTools();
  }

  // --- Terminal Spawning Logic ---
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  });

  // Forward data from pty to renderer
  ptyProcess.on('data', function (data) {
    win.webContents.send('terminal.incomingData', data);
  });

  // Handle data from renderer to pty
  ipcMain.on('terminal.toTerminal', (event, data) => {
    ptyProcess.write(data);
  });
  
  // Handle resize from renderer
  ipcMain.on('terminal.resize', (event, { cols, rows }) => {
    ptyProcess.resize(cols, rows);
  });
  
  // Clean up the pty process when the window is closed
  win.on('closed', () => {
    ptyProcess.kill();
  });
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
