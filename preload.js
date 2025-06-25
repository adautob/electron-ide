const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process (the Next.js app)
// We keep the API shape but make them no-ops to avoid errors if they are called.
contextBridge.exposeInMainWorld('electronAPI', {
  onTerminalData: (callback) => {
    // This function must return a cleanup function.
    return () => {};
  },
  sendToTerminal: (data) => {
    // No-op
  },
  resizeTerminal: (size) => {
    // No-op
  },
  removeAllListeners: (channel) => {
    // No-op
  }
});
