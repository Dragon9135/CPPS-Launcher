// main.js (Electron 11.5.0 - Final Optimized Version)
// 1. GÜNCELLEME: 'ipcMain' kaldırıldı (artık kullanılmıyor).
const { app, BrowserWindow, BrowserView, session, Menu, dialog, systemPreferences } = require('electron'); 
const path = require('path');

// === Required Variables ===
const isDev = !app.isPackaged;
const resourcesPath = isDev ? __dirname : process.resourcesPath;
const topMenuHeight = 0; // 0 because we use a native menu

// === 32/64-bit Plugin Path Logic ===
const arch = process.arch === 'ia32' ? 'x86' : 'x64'; 
const pluginName = 'pepflashplayer.dll';
const pluginPath = path.join(resourcesPath, 'plugins', arch, pluginName);

let mainWindow;
let view;

// === Performance & Flash Flags ===
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('ppapi-flash-path', pluginPath); 
app.commandLine.appendSwitch('ppapi-flash-version', '34.0.0.330');
app.commandLine.appendSwitch('allow-outdated-plugins');
app.commandLine.appendSwitch('ignore-certificate-errors');

// === Ad/Tracker Block List ===
const BLOCK_LIST = [
  'googlesyndication.com','googleadservices.com','doubleclick.net',
  'ads.pubmatic.com','adnxs.com','rubiconproject.com','openx.net','criteo.com',
  'taboola.com','outbrain.com','amazon-adsystem.com','adsrvr.org','bidswitch.net',
  'popads.net','propellerads.com','adsterra.com','google-analytics.com',
  'analytics.google.com','googletagmanager.com','facebook.net','connect.facebook.net',
  'scorecardresearch.com','quantserve.com','adobedtm.com','hotjar.com','moatads.com'
];

// === Cosmetic Filter (for newcp.net) ===
const NEWCP_COSMETIC_CSS = `
  #newcp_net_160x600_left_sticky,
  #newcp_net_160x600_right_sticky,
  [style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;"] {
    display: none !important; visibility: hidden !important; width: 0 !important;
    height: 0 !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important;
  }
`;

// === Content Filtering (Header Cleanup) ===
function setupSessionInterceptors(sess) {
  // Clean X-Frame-Options and CSP
  sess.webRequest.onHeadersReceived((details, callback) => {
    try {
      const headers = Object.assign({}, details.responseHeaders);
      const relevant = ['main_frame','sub_frame','object'];
      if (relevant.includes(details.resourceType)) {
        for (const k of Object.keys(headers)) {
          if (k.toLowerCase() === 'x-frame-options') delete headers[k];
          if (k.toLowerCase() === 'content-security-policy') {
            const orig = Array.isArray(headers[k]) ? headers[k][0] : headers[k];
            const filtered = (orig || '').split(';').filter(d => !d.trim().startsWith('frame-ancestors')).join(';');
            headers[k] = [filtered];
          }
        }
      }
      callback({ responseHeaders: headers });
    } catch (err) {
      callback({}); 
    }
  });

  // Block ads
  sess.webRequest.onBeforeRequest((details, callback) => {
    const blocked = BLOCK_LIST.some(item => (details.url || '').includes(item));
    callback({ cancel: blocked });
  });
}

// === BrowserView Resize Function ===
function resizeView() {
  if (!mainWindow || !view) return;
  const [w, h] = mainWindow.getContentSize();
  view.setBounds({ x: 0, y: topMenuHeight, width: w, height: h - topMenuHeight });
}

// === "About" Dialog Box Function ===
function showAboutDialog() {
  if (!mainWindow) return;
  const appVersion = app.getVersion();
  const electronVersion = process.versions.electron;
  
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About',
    message: `CPPS Launcher v${appVersion}`,
    detail: `Created by Dragon9135.\nElectron: ${electronVersion}\nClean Flash Player: 34.0.0.330 (x64/x86)\nNode.js: 18.20.8 (x64)\n\nIt is a completely open-source project.\nIt was developed for hobby purposes.`,
    buttons: ['OK']
  });
}

// === Native Menu Template ===
const menuTemplate = [
  {
    label: 'Servers',
    submenu: [
      { label: 'New Club Penguin', click: () => { if (view) view.webContents.loadURL('https://play.newcp.net/'); }},
      { label: 'CPPS.to', click: () => { if (view) view.webContents.loadURL('https://media.cpps.to/play/'); }},
      { label: 'Antique Penguin', click: () => { if (view) view.webContents.loadURL('https://play.antiquepengu.in/'); }},
      { label: 'Club Penguin Zero', click: () => { if (view) view.webContents.loadURL('https://play.cpzero.net/'); }}
    ]
  },
  {
    label: 'Options',
    submenu: [
      { label: 'Reload', click: () => { if (view) view.webContents.reload(); }, accelerator: 'F5' }
      // DevTools menüsü aşağıda, 'isDev' kontrolü ile eklenecek
    ]
  },
  {
    label: 'About',
    click: () => { showAboutDialog(); }
  }
];

// 2. GÜNCELLEME: DevTools menüsünü sadece 'isDev' true ise ekle
if (isDev) {
  menuTemplate[1].submenu.push( // "Options" menüsüne ekle
    { type: 'separator' },
    { 
      label: 'Toggle Developer Tools', 
      click: () => { if (view) view.webContents.toggleDevTools(); }, 
      accelerator: 'Ctrl+Shift+I' 
    }
  );
}

// === Create Main Window ===
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#000000', 
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      spellcheck: false,
      devTools: false, 
      sandbox: false 
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Create and set the native menu
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // === Create BrowserView (The Game Window) ===
  view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      plugins: true, 
      sandbox: false,
      devTools: isDev // DevTools'u 'isDev' durumuna bağla
    }
  });
  mainWindow.setBrowserView(view);

  // 3. GÜNCELLEME: Flash iznini 'defaultSession' yerine 'view' oturumuna uygula
  view.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'flash') return callback(true);
    callback(false);
  });
  
  view.setAutoResize({ width: true, height: true });
  resizeView(); 
  mainWindow.on('resize', resizeView);

  // Setup blocking and filtering for the view
  setupSessionInterceptors(view.webContents.session);

  // Forward error events to the renderer (index.html)
  view.webContents.on('crashed', () => mainWindow.webContents.send('view/crashed'));
  view.webContents.on('did-fail-load', (e, code, desc, url) =>
    mainWindow.webContents.send('view/load-failed', { code, desc, url })
  );

  // Apply Cosmetic Filter
  view.webContents.on('did-finish-load', async () => {
    try {
      const url = view.webContents.getURL();
      if (url.includes('newcp.net')) {
        await view.webContents.insertCSS(NEWCP_COSMETIC_CSS);
      }
    } catch (err) {
      console.error('Error injecting cosmetic CSS:', err);
    }
  });

  // Load the default server
  view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
  view.webContents.loadURL('https://newcp.net/en-US/');
}

// === IPC Listeners ===
// (No longer needed)

// Set the app theme (dark/light mode) to match the OS
systemPreferences.themeSource = 'system';

// === App Lifecycle ===
app.whenReady().then(() => {
  // Flash izni buradan KALDIRILDI ve createWindow içine taşındı
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
