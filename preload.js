const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process (the Next.js app)
// We are keeping the shell of the API for now, but the functions do nothing
// as the real terminal is disabled to prevent build errors.
contextBridge.exposeInMainWorld('electronAPI', {
  onTerminalData: () => {},
  sendToTerminal: () => {},
  resizeTerminal: () => {},
  removeAllListeners: () => {}
});
