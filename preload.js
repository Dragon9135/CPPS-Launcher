// preload.js (Simplified)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // === Listen for events from main.js ===
  onViewCrashed: (callback) => ipcRenderer.on('view/crashed', () => callback()),
  onViewLoadFailed: (callback) => ipcRenderer.on('view/load-failed', (e, data) => callback(data))
  
  // setMenuOpen, loadURL, reloadView, getAppInfo were removed as they are no longer needed.
});
