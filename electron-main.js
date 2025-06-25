
// electron-main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const pty = require('node-pty');

// Determine shell based on OS
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
let ptyProcess = null;

async function createWindow() {
  // Dynamically import electron-is-dev
  const { default: isDev } = await import('electron-is-dev');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // Secure bridge to the renderer process
    },
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // --- IPC Handlers for the Pseudo-Terminal ---
  ipcMain.on('pty:spawn', (event, { cwd }) => {
    // Kill existing pty process if any
    if (ptyProcess) {
      ptyProcess.kill();
    }
    
    // Spawn a new pty process in the user's home directory or provided CWD
    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: cwd || os.homedir(), // Use provided CWD or default to home directory
      env: process.env
    });

    // Send data from pty to the renderer
    ptyProcess.onData(data => {
      win.webContents.send('pty:data', data);
    });
    
    // Notify renderer when pty exits
    ptyProcess.onExit(({ exitCode, signal }) => {
      win.webContents.send('pty:exit', `Terminal exited with code: ${exitCode}`);
      ptyProcess = null;
    });
  });

  ipcMain.on('pty:write', (event, data) => {
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  });

  ipcMain.on('pty:resize', (event, { cols, rows }) => {
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
    }
  });
  
  ipcMain.on('pty:kill', () => {
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcess = null;
    }
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
  if (ptyProcess) {
    ptyProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
