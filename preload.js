const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Terminal communication
  onTerminalData: (callback) => ipcRenderer.on('terminal.incomingData', (event, data) => callback(data)),
  sendToTerminal: (data) => ipcRenderer.send('terminal.keystroke', data),
  resizeTerminal: (data) => ipcRenderer.send('terminal.resize', data),

  // Ensure all previously exposed APIs are kept if any.
  // This is an empty placeholder, but good practice.
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});