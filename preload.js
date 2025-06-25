// preload.js
// This file is no longer used by electron-main.js for the simulated terminal,
// but it is kept here in case it's needed for other future Electron main-process interactions.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {});
