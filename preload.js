
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Renderer to Main (one-way)
  ptyWrite: (data) => ipcRenderer.send('pty:write', data),
  ptyResize: (size) => ipcRenderer.send('pty:resize', size),
  ptyKill: () => ipcRenderer.send('pty:kill'),
  ptySpawn: (options) => ipcRenderer.send('pty:spawn', options),
  
  // Main to Renderer (listening)
  onPtyData: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('pty:data', subscription);
    // Return a cleanup function to remove the listener
    return () => ipcRenderer.removeListener('pty:data', subscription);
  },
  onPtyExit: (callback) => {
    const subscription = (event, reason) => callback(reason);
    ipcRenderer.on('pty:exit', subscription);
    return () => ipcRenderer.removeListener('pty:exit', subscription);
  }
});
