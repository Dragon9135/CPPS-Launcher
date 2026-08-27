const { contextBridge, ipcRenderer } = require('electron');

const cleanupFunctions = [];

contextBridge.exposeInMainWorld('electronAPI', {
    onViewCrashed: (callback) => {
        const safeCallback = () => callback();
        ipcRenderer.on('view/crashed', safeCallback);
        const cleanup = () => ipcRenderer.removeListener('view/crashed', safeCallback);
        cleanupFunctions.push(cleanup);
        return cleanup;
    },
    onViewLoadFailed: (callback) => {
        const safeCallback = (event, data) => callback(data);
        ipcRenderer.on('view/load-failed', safeCallback);
        const cleanup = () => ipcRenderer.removeListener('view/load-failed', safeCallback);
        cleanupFunctions.push(cleanup);
        return cleanup;
    },
    cleanup: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
    }
});

window.addEventListener('unload', () => {
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions.length = 0;
});
