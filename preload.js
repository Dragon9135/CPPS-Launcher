const {
    contextBridge,
    ipcRenderer
} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

    onViewCrashed: (callback) => {

        const safeCallback = () => callback();

        ipcRenderer.on('view/crashed', safeCallback);

        return () => ipcRenderer.removeListener('view/crashed', safeCallback);
    },

    onViewLoadFailed: (callback) => {

        const safeCallback = (event, data) => callback(data);

        ipcRenderer.on('view/load-failed', safeCallback);

        return () => ipcRenderer.removeListener('view/load-failed', safeCallback);
    }
});
