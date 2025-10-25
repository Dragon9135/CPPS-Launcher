const { app, BrowserWindow } = require('electron');
const path = require('path');

// --- FLASH PLUGIN SETUP ---
const pluginName = 'pepflashplayer.dll';
const isDev = !app.isPackaged;
const resourcesPath = isDev ? __dirname : process.resourcesPath;
const pluginPath = path.join(resourcesPath, 'plugins', pluginName);

// --- FULL OPTIMIZATIONS (LIGHTWEIGHT) ---

// 1. IMAGE SHARPNESS FIX (DPI SCALING)
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('high-dpi-support', '0');

// 2. PERFORMANCE (GPU & BACKGROUND)
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

// 3. FLASH & SECURITY
app.commandLine.appendSwitch('ppapi-flash-path', pluginPath);
app.commandLine.appendSwitch('ppapi-flash-version', '34.0.0.330');
app.commandLine.appendSwitch('allow-outdated-plugins');
app.commandLine.appendSwitch('ignore-certificate-errors'); // Required for SSL errors

// --- CREATE WINDOW ---
function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 600, // Height for our HTML menu
    backgroundColor: '#000000',

    // --- NEW: APPLICATION ICON ---
    // Looks for 'icon.ico' (Win) or 'icon.icns' (Mac) in the project root
    icon: path.join(__dirname, 'icon.ico'), // Make sure icon.ico is in the same folder as main.js

    webPreferences: {
      plugins: true,
      webviewTag: true, // Allow <webview> tag
      
      // Security & Optimization
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      devTools: false
    }
  });

  // Remove the OS menu bar (we have our own HTML menu)
  win.setMenu(null); 

  win.loadFile('index.html');

}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});