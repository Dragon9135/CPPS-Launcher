// main.js (Electron 11.5.0 - Final Optimized + Discord RPC + Manual Update Check)
// 'shell' is needed again to open external links
const { app, BrowserWindow, BrowserView, session, Menu, dialog, systemPreferences, shell } = require('electron'); 
const path = require('path');
const RPC = require('discord-rpc'); 

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

// === Discord RPC Settings ===
const clientId = 'CLIENT_ID'; // Your Client ID
const rpc = new RPC.Client({ transport: 'ipc' });
let rpcReady = false;

async function setDiscordActivity() {
  if (!rpc || !rpcReady) { return; } // Don't try if RPC isn't connected
  try {
    await rpc.setActivity({
      details: 'Playing Club Penguin',
      state: 'Exploring the Island', // Corrected typo
      startTimestamp: Date.now(),
      largeImageKey: 'logo',          // Asset key for the large image (upload named 'logo' in Discord Dev Portal)
      largeImageText: 'CPPS Launcher', // Tooltip for the large image
      instance: false,               // Prevents users from joining your "game"
    });
    console.log("Discord activity set successfully.");
  } catch (err) {
    console.error("Failed to set Discord activity:", err); // Log errors if setting activity fails
  }
}

function initDiscordRPC() {
  rpc.on('ready', () => {
    console.log('Discord RPC is ready.');
    rpcReady = true;
    setDiscordActivity(); // Set initial activity when connected

    // Refresh the status every 15 minutes (Discord sometimes drops the connection)
    setInterval(() => {
      setDiscordActivity();
    }, 15 * 60 * 1000);
  });

  // Handle connection errors (e.g., if Discord isn't running)
  rpc.login({ clientId }).catch(err => {
    console.error("Discord RPC login failed (Discord might be closed):", err.message);
    rpcReady = false; // Ensure we know connection failed
  });

  // Handle disconnection
  rpc.on('disconnected', () => {
      console.log('Discord RPC disconnected.');
      rpcReady = false;
  });
}
// === END OF DISCORD CODE ===

// === Performance & Flash Flags ===
app.commandLine.appendSwitch('force-device-scale-factor', '1'); // Force 100% scaling for crisp Flash
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('ignore-gpu-blocklist');       // Try to use GPU acceleration even if blacklisted
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('disable-background-networking'); // Reduce background activity
app.commandLine.appendSwitch('disable-renderer-backgrounding'); // Keep renderer active
app.commandLine.appendSwitch('disable-background-timer-throttling'); // Keep timers running smoothly
app.commandLine.appendSwitch('disable-extensions');              // No extensions needed

// Flash Specific Flags
app.commandLine.appendSwitch('ppapi-flash-path', pluginPath); // Tell Electron where the plugin is
app.commandLine.appendSwitch('ppapi-flash-version', '34.0.0.330'); // Specify plugin version
app.commandLine.appendSwitch('allow-outdated-plugins');          // Allow Flash to run
app.commandLine.appendSwitch('ignore-certificate-errors');       // Some CPPS use invalid SSL certs

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

// === Content Filtering (Header Cleanup & Ad Blocking) ===
function setupSessionInterceptors(sess) {
  // Clean X-Frame-Options and Content-Security-Policy headers to prevent blank screens
  sess.webRequest.onHeadersReceived((details, callback) => {
    try {
      const headers = { ...details.responseHeaders }; // Create a mutable copy
      const relevantTypes = ['main_frame','sub_frame','object'];
      if (relevantTypes.includes(details.resourceType)) {
        for (const key of Object.keys(headers)) {
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'x-frame-options') {
            delete headers[key];
          } else if (lowerKey === 'content-security-policy') {
            const originalValue = Array.isArray(headers[key]) ? headers[key][0] : headers[key];
            const filteredValue = (originalValue || '')
              .split(';')
              .filter(directive => !directive.trim().startsWith('frame-ancestors'))
              .join(';');
            headers[key] = [filteredValue]; // Ensure value is an array
          }
        }
      }
      callback({ responseHeaders: headers });
    } catch (err) {
      console.error("Error modifying headers:", err);
      callback({}); // Proceed without modification on error
    }
  });

  // Block requests based on BLOCK_LIST
  sess.webRequest.onBeforeRequest((details, callback) => {
    const shouldBlock = BLOCK_LIST.some(blockItem => (details.url || '').includes(blockItem));
    callback({ cancel: shouldBlock });
  });
}

// === BrowserView Resize Function ===
// Adjusts the view size to fill the window below the native menu
function resizeView() {
  if (!mainWindow || !view || mainWindow.isDestroyed() || view.webContents.isDestroyed()) return;
  try {
    const [windowWidth, windowHeight] = mainWindow.getContentSize();
    view.setBounds({ x: 0, y: topMenuHeight, width: windowWidth, height: windowHeight - topMenuHeight });
  } catch (err) {
      console.error("Error resizing BrowserView:", err);
  }
}

// === "About" Dialog Box Function ===
function showAboutDialog() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const appVersion = app.getVersion();
  const electronVersion = process.versions.electron;

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About',
    message: `CPPS Launcher v${appVersion}`,
    detail: `Created by Dragon9135.\nElectron: ${electronVersion}\nClean Flash Player: 34.0.0.330 (x64/x86)\nNode.js (Build): 18.20.8 (x64)\n\nThis is a completely open-source project.\nIt was developed for hobby purposes.`,
    buttons: ['OK']
  });
}

// === Native Menu Template ===
const menuTemplate = [
  {
    label: 'Servers',
    submenu: [
      { label: 'New Club Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.newcp.net/'); }},
      { type: 'separator' },
      { label: 'CPPS.to', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://media.cpps.to/play/'); }},
      { type: 'separator' },
      { label: 'Antique Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.antiquepengu.in/'); }},
      { type: 'separator' },
      { label: 'Club Penguin Zero', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.cpzero.net/'); }},
      { type: 'separator' },
      { label: 'Original Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://old.ogpenguin.online/'); }}
    ]
  },
  {
    label: 'Options',
    submenu: [
      { label: 'Reload', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.reload(); }, accelerator: 'F5' },
      { type: 'separator' }, // <-- Separator added
      { // <-- NEW MENU ITEM ADDED
        label: 'Check for Updates', 
        click: () => { 
          // Open the GitHub releases page in the default browser
          shell.openExternal('https://github.com/Dragon9135/CPPS-Launcher/releases/latest'); 
        } 
      }
      // DevTools menu added below conditionally
    ]
  },
  {
    label: 'About',
    click: showAboutDialog // Reference the function
  }
];

// Add DevTools menu only if running in development mode
if (isDev) {
  // Find the Options submenu (index 1)
  const optionsSubmenu = menuTemplate[1].submenu; 
  optionsSubmenu.push( // Add DevTools after "Check for Updates"
    { type: 'separator' }, // Add another separator
    {
      label: 'Toggle Developer Tools',
      click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.toggleDevTools(); },
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
    backgroundColor: '#000000', // Black background while loading
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,    // Security best practice
      contextIsolation: true,    // Security best practice
      enableRemoteModule: false, // Security best practice
      spellcheck: false,
      devTools: false,           // DevTools for main window disabled
      sandbox: false             // Required for Flash in Electron 11
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Create and set the native application menu
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // === Create BrowserView (The Game Window) ===
  view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      plugins: true,           // Enable Flash plugin support
      sandbox: false,          // Required for Flash in Electron 11
      devTools: isDev          // Enable DevTools for the view only in dev mode
    }
  });
  mainWindow.setBrowserView(view);

  // Grant Flash permission specifically for the view's session
  view.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'flash') return callback(true); // Allow Flash
    callback(false); // Deny other permissions
  });

  // Setup auto-resizing and initial size
  view.setAutoResize({ width: true, height: true });
  resizeView();
  mainWindow.on('resize', resizeView); // Re-run resize on window change

  // Apply ad blocking and header fixes to the view's session
  setupSessionInterceptors(view.webContents.session);

  // Forward crucial events from the view to the (simplified) renderer if needed
  view.webContents.on('crashed', () => {
      console.error("BrowserView crashed!");
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('view/crashed');
      }
  });
  view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`BrowserView failed to load URL: ${validatedURL} Error: ${errorDescription} (${errorCode})`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('view/load-failed', { code: errorCode, desc: errorDescription, url: validatedURL });
    }
  });

  // Apply Cosmetic Filter after the page finishes loading
  view.webContents.on('did-finish-load', async () => {
    try {
        if (view.webContents.isDestroyed()) return; // Check if view still exists
        const url = view.webContents.getURL();
        if (url.includes('newcp.net')) {
            await view.webContents.insertCSS(NEWCP_COSMETIC_CSS);
            console.log("Cosmetic filter applied to newcp.net.");
        }
    } catch (err) {
        console.error('Error injecting cosmetic CSS:', err);
    }
  });

  // Load the default server
  view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
  try {
      view.webContents.loadURL('https://newcp.net/en-US/');
  } catch (err) {
      console.error("Error loading initial URL:", err);
  }


  // Initialize Discord RPC (only in packaged app or if explicitly testing)
  // if (!isDev) { // Uncomment this line if you ONLY want RPC in the final build
     initDiscordRPC();
  // }
}

// === IPC Listeners ===
// (No longer needed as menu is native and errors are handled via webContents.send)

// Set the app theme (dark/light mode) to match the OS
systemPreferences.themeSource = 'system';

// === App Lifecycle ===
app.whenReady().then(() => {
  createWindow();
});

// Clean up Discord RPC when the app closes
app.on('window-all-closed', () => {
  if (rpcReady) {
    try {
      rpc.destroy();
      console.log("Discord RPC connection closed.");
    } catch (err) {
      console.error("Error destroying Discord RPC:", err);
    }
  }
  // Standard quit behavior
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Re-create window on macOS if dock icon is clicked and no windows exist
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
