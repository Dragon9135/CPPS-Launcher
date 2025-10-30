// preload.js
// This script securely exposes specific Electron APIs (Inter-Process Communication)
// to the renderer process (index.html) using the contextBridge.
// It allows the main process to send events to the renderer window securely.
const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, limited API to the renderer process under 'window.electronAPI'
contextBridge.exposeInMainWorld('electronAPI', {
  
  /**
   * Registers a listener for the 'view/crashed' event.
   * This event is intended to be sent from the main process
   * if the BrowserView (game view) crashes.
   * @param {function} callback - The function to execute when the event is received.
   * @returns {function} A "cleanup" function that can be called to remove this listener.
   */
  onViewCrashed: (callback) => {
    // We wrap the callback in a new function to ensure we control
    // what arguments are passed and to keep a stable reference for removal.
    const safeCallback = () => callback();
    
    ipcRenderer.on('view/crashed', safeCallback);
    
    // Return a function that the renderer can call to unsubscribe
    return () => ipcRenderer.removeListener('view/crashed', safeCallback);
  },
  
  /**
   * Registers a listener for the 'view/load-failed' event.
   * This event is intended to be sent from the main process
   * if the BrowserView (game view) fails to load a page.
   * @param {function} callback - The function to execute. It will receive the 'data'
   * payload sent from the main process.
   * @returns {function} A "cleanup" function that can be called to remove this listener.
   */
  onViewLoadFailed: (callback) => {
    // We wrap the callback to explicitly pass only the 'data' argument,
    // hiding the 'event' object from the renderer for security.
    const safeCallback = (event, data) => callback(data);
    
    ipcRenderer.on('view/load-failed', safeCallback);
    
    // Return a function that the renderer can call to unsubscribe
    return () => ipcRenderer.removeListener('view/load-failed', safeCallback);
  }
});
