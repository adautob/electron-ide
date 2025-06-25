const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process (the Next.js app)
contextBridge.exposeInMainWorld('electronAPI', {
  onTerminalData: (callback) => ipcRenderer.on('terminal.incomingData', (event, data) => callback(data)),
  sendToTerminal: (data) => ipcRenderer.send('terminal.toTerminal', data),
  resizeTerminal: (size) => ipcRenderer.send('terminal.resize', size),
  // Keep this to un-register listeners and prevent memory leaks
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
