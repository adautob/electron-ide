// electron-main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const pty = require('node-pty');

let mainWindow;

// Determine shell based on OS
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

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

  // Terminal logic
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  });

  // Send terminal data to renderer process
  ptyProcess.on('data', function (data) {
    mainWindow.webContents.send('terminal.incomingData', data);
  });

  // Handle user input from renderer process
  ipcMain.on('terminal.keystroke', (event, key) => {
    ptyProcess.write(key);
  });

  // Handle terminal resize from renderer process
  ipcMain.on('terminal.resize', (event, { cols, rows }) => {
    ptyProcess.resize(cols, rows);
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