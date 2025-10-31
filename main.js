// main.js (Electron 11.5.0 - Final Optimized Version)
const { app, BrowserWindow, BrowserView, session, Menu, dialog, systemPreferences, shell } = require('electron');
const path = require('path');
const fs = require('fs'); // File System module
const util = require('util'); // Needed for fs.exists
const { rmdir: rmdirAsync } = require('fs').promises; // Use native promise-based rmdir
const existsAsync = util.promisify(fs.exists); // fs.exists is callback-only
const RPC = require('discord-rpc'); // For Discord Rich Presence

// === Required Variables ===
const isDev = !app.isPackaged; // Check if running in development or packaged app
const resourcesPath = isDev ? __dirname : process.resourcesPath; // Path to app resources
const topMenuHeight = 0; // Height reserved for menu (0 for native menu)

// === 32/64-bit Plugin Path Logic ===
const arch = process.arch === 'ia32' ? 'x86' : 'x64'; // Detect architecture
const pluginName = 'pepflashplayer.dll';
// Construct the path to the correct Flash plugin based on architecture
const pluginPath = path.join(resourcesPath, 'plugins', arch, pluginName);

// === Global Variables ===
let mainWindow = null; // Reference to the main application window
let view = null; // Reference to the BrowserView hosting the game
let isFlashFitted = false; // Tracks the state of the experimental 'Fit Flash' feature
let flashFitCSSKey = null; // Stores the key for CSS injected by 'Fit Flash'

// === Discord RPC Settings ===
const clientId = 'CLIENT_ID'; // Your Discord Application Client ID
const rpc = new RPC.Client({ transport: 'ipc' });
let rpcReady = false; // Tracks if the RPC connection is established
let rpcInterval = null; // Stores the interval timer for presence updates

/**
 * Sets the Discord Rich Presence status.
 */
async function setDiscordActivity() {
  // Don't try if RPC isn't connected or client is not ready
  if (!rpc || !rpcReady) {
    return;
  }
  
  try {
    await rpc.setActivity({
      details: 'Playing Club Penguin',
      state: 'Exploring the Island',
      startTimestamp: Date.now(),
      largeImageKey: 'logo',        // Asset key (upload 'logo' in Discord Dev Portal)
      largeImageText: 'CPPS Launcher', // Tooltip for the large image
      instance: false,              // Prevents "Join Game" button
    });
    // console.log("Discord activity set successfully."); // Optional: uncomment for debugging
  } catch (err) {
    console.error("Failed to set Discord activity:", err);
    // If connection fails, mark as not ready and trigger a reconnect attempt
    if (err.message.includes('Could not connect') || err.message.includes('disconnected')) {
      rpcReady = false;
      if (rpcInterval) clearInterval(rpcInterval); // Stop trying to update
      rpcInterval = null;
      console.log("Discord RPC connection lost. Attempting reconnection...");
      // Use setTimeout to avoid rapid looping
      setTimeout(() => {
        if (!rpcReady) initDiscordRPC();
      }, 30 * 1000); // Try again in 30 seconds
    }
  }
}

/**
 * Initializes the Discord RPC connection and sets up event listeners.
 */
function initDiscordRPC() {
  // Prevent multiple initializations if already trying/connected
  // Check socket state if rpc object exists
  if (rpcReady || (rpc.transport && rpc.transport.socket && rpc.transport.socket.readyState === 'open')) {
    // console.log("Discord RPC already initialized or connecting."); // Optional debug
    return;
  }

  // Clear previous listeners to prevent duplicates on reconnect attempts
  rpc.removeAllListeners();

  rpc.on('ready', () => {
    console.log('Discord RPC is ready.');
    rpcReady = true;
    setDiscordActivity(); // Set initial status

    // Clear any existing interval before setting a new one
    if (rpcInterval) clearInterval(rpcInterval);
    // Set interval to refresh status periodically
    rpcInterval = setInterval(() => {
      if (rpcReady) setDiscordActivity();
    }, 15 * 60 * 1000); // Refresh every 15 minutes
  });

  // Handle connection errors gracefully (e.g., Discord not running)
  rpc.login({ clientId }).catch(err => {
    console.error("Discord RPC login failed (Discord might be closed):", err.message);
    rpcReady = false;
    // Attempt to reconnect after a delay if login fails
    setTimeout(() => {
      if (!rpcReady) initDiscordRPC();
    }, 60 * 1000); // Try again in 60 seconds
  });

  // Handle disconnections
  rpc.on('disconnected', () => {
    console.log('Discord RPC disconnected.');
    rpcReady = false;
    if (rpcInterval) clearInterval(rpcInterval); // Clear interval on disconnect
    rpcInterval = null;
    // Attempt to reconnect after a delay
    setTimeout(() => {
      if (!rpcReady) initDiscordRPC();
    }, 60 * 1000); // Try again in 60 seconds
  });
}
// === END OF DISCORD CODE ===

// === Performance & Flash Flags ===
app.commandLine.appendSwitch('ppapi-flash-path', pluginPath);
app.commandLine.appendSwitch('ppapi-flash-version', '34.0.0.330');
app.commandLine.appendSwitch('allow-outdated-plugins');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-client-side-phishing-detection');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-audio-input');
app.commandLine.appendSwitch('disable-features', 'MediaRouter');

// === Ad/Tracker Block List ===
const BLOCK_LIST = [
  'googlesyndication.com', 'googleadservices.com', 'doubleclick.net',
  'ads.pubmatic.com', 'adnxs.com', 'rubiconproject.com', 'openx.net', 'criteo.com',
  'taboola.com', 'outbrain.com', 'amazon-adsystem.com', 'adsrvr.org', 'bidswitch.net',
  'popads.net', 'propellerads.com', 'adsterra.com', 'google-analytics.com',
  'analytics.google.com', 'googletagmanager.com', 'facebook.net', 'connect.facebook.net',
  'scorecardresearch.com', 'quantserve.com', 'adobedtm.com', 'hotjar.com', 'moatads.com'
];

// === Cosmetic Filter (for newcp.net) ===
// CSS to hide specific ad elements on newcp.net
const NEWCP_COSMETIC_CSS = `
  #newcp_net_160x600_left_sticky,
  #newcp_net_160x600_right_sticky,
  [style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;"] {
    display: none !important; visibility: hidden !important; width: 0 !important;
    height: 0 !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important;
  }
`;

// === Content Filtering (Header Cleanup & Ad Blocking) ===
/**
 * Sets up web request listeners for a given session to block ads and fix headers.
 * @param {session.Session} sess - The Electron session object.
 */
function setupSessionInterceptors(sess) {
  if (!sess) return;
  
  // Clean X-Frame-Options and Content-Security-Policy headers
  sess.webRequest.onHeadersReceived((details, callback) => {
    try {
      const headers = { ...details.responseHeaders };
      const relevantTypes = ['main_frame', 'sub_frame', 'object'];
      
      if (relevantTypes.includes(details.resourceType)) {
        for (const key of Object.keys(headers)) {
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'x-frame-options') {
            delete headers[key]; // Remove X-Frame-Options entirely
          } else if (lowerKey === 'content-security-policy') {
            // Remove 'frame-ancestors' directive from CSP
            const originalValue = Array.isArray(headers[key]) ? headers[key][0] : headers[key];
            headers[key] = [(originalValue || '').split(';').filter(d => !d.trim().startsWith('frame-ancestors')).join(';')];
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
/**
 * Resizes the BrowserView to fit the main window content area.
 */
function resizeView() {
  // Ensure both window and view exist and are not destroyed
  if (!mainWindow || mainWindow.isDestroyed() || !view || view.webContents.isDestroyed()) {
    return;
  }
  
  try {
    const [windowWidth, windowHeight] = mainWindow.getContentSize();
    view.setBounds({ x: 0, y: topMenuHeight, width: windowWidth, height: windowHeight - topMenuHeight });
  } catch (err) {
    console.error("Error resizing BrowserView:", err);
  }
}

// === "About" Dialog Box Function ===
/**
 * Shows the application's About dialog.
 */
function showAboutDialog() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  const appVersion = app.getVersion();
  const electronVersion = process.versions.electron;
  // const nodeVersion = process.versions.node; // Get Node version Electron is built with

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About',
    message: `CPPS Launcher v${appVersion}`,
    detail: `Created by Dragon9135.\n\nElectron: ${electronVersion}\nClean Flash Player: 34.0.0.330 (x86/x64)\nNode.js (Build): 18.20.8\n\nThis is an open-source project developed for hobby purposes.`,
    buttons: ['OK']
  });
}

// === Clear Browsing Data AND Flash Data Function (Asynchronous) ===
/**
 * Clears Electron session data (cache, cookies, storage) and the Pepper Flash data folder.
 */
async function clearBrowsingAndFlashData() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // 1. Warn the user before proceeding
  const confirmation = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Confirm Data Clearing',
    message: 'Clear browsing data and Flash Player data?',
    detail: 'This will remove cache, cookies, local storage, and Flash Player saved data (LSOs). Logins and site settings might be lost. The current page will reload after clearing.',
    buttons: ['Clear Data', 'Cancel'],
    defaultId: 1, // Default to Cancel
    cancelId: 1
  });

  if (confirmation.response === 1) { // If user clicked Cancel
    console.log("User cancelled data clearing.");
    return;
  }

  let flashDataCleared = false;
  let browsingDataCleared = false;
  let flashError = null;
  let browsingError = null;

  // 2. Delete Flash Data Folder Asynchronously
  const userDataPath = app.getPath('userData');
  const flashDataPath = path.join(userDataPath, 'Pepper Data');
  console.log(`Attempting to clear Flash data in: ${flashDataPath}`);
  
  try {
    if (await existsAsync(flashDataPath)) {
      // Use native promisified rmdir with recursive option and retries
      await rmdirAsync(flashDataPath, { recursive: true, maxRetries: 3 });
      console.log("Flash (Pepper Data) folder cleared successfully.");
      flashDataCleared = true;
    } else {
      console.log("Flash (Pepper Data) folder not found, skipping deletion.");
      flashDataCleared = true; // No folder means it's "clear"
    }
  } catch (err) {
    console.error("Error clearing Flash (Pepper Data) folder:", err);
    flashError = err;
  }

  // 3. Clear Electron Browsing Data Asynchronously (if view exists)
  if (view && view.webContents && !view.webContents.isDestroyed()) {
    console.log("Attempting to clear Electron browsing data...");
    try {
      const electronSession = view.webContents.session;
      const storageOptions = {
        storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
        origin: '*'
      };
      
      // Run cache and storage clearing in parallel for speed
      await Promise.all([
        electronSession.clearCache(),
        electronSession.clearStorageData(storageOptions)
      ]);
      
      console.log("Electron browsing data cleared successfully.");
      browsingDataCleared = true;
    } catch (err) {
      console.error("Error clearing Electron browsing data:", err);
      browsingError = err;
    }
  } else {
    console.log("BrowserView not available, skipping Electron browsing data clearing.");
    // Consider overall success if Flash part succeeded, even if view wasn't available
    if (flashDataCleared) browsingDataCleared = true; 
  }

  // 4. Notify User and Reload
  let finalTitle;
  let finalMessage;
  let finalDetay;
  let finalType = 'info';

  if (flashDataCleared && browsingDataCleared) {
    finalTitle = 'Data Cleared';
    finalMessage = 'Browsing data and Flash Player data have been cleared successfully.';
    finalDetail = 'The current page will now reload.';
  } else {
    finalTitle = 'Clearing Issue';
    finalMessage = 'There was an issue clearing all data.';
    const flashStatus = flashDataCleared ? 'Cleared' : `Failed (${flashError?.code || 'Check Logs'})`;
    const browsingStatus = browsingDataCleared ? 'Cleared' : `Failed (${browsingError?.message?.split(':')[0] || 'Check Logs'})`;
    finalDetail = `Flash Data: ${flashStatus}\nBrowsing Data: ${browsingStatus}\nPlease check console logs for details.`;
    finalType = 'warning';
  }

  // Ensure mainWindow still exists before showing the final dialog
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showMessageBox(mainWindow, {
      type: finalType,
      title: finalTitle,
      message: finalMessage,
      detail: finalDetail,
      buttons: ['OK']
    }).then(() => {
      // Reload the page regardless of success/failure, if view still exists
      if (view && !view.webContents.isDestroyed()) {
        console.log("Reloading the page after clearing data attempt.");
        view.webContents.reloadIgnoringCache(); // Force reload without cache
      }
    });
  } else {
    console.log("Main window closed before clearing could finish reporting.");
  }
}
// === END OF Clear Data FUNCTION ===

// === Fit Flash to Window Function (Experimental) ===
/**
 * Toggles CSS styles on the Flash element to attempt fitting it to the viewport.
 */
async function toggleFlashFit() {
  if (!view || !view.webContents || view.webContents.isDestroyed()) {
    console.log("Cannot toggle Flash fit: BrowserView not available.");
    return;
  }

  isFlashFitted = !isFlashFitted; // Toggle the state

  // JavaScript code to inject into the BrowserView
  // This script attempts to find the Flash object/embed and apply/revert styles
  const script = `
      (function() {
        const flashElement = document.querySelector('embed[type="application/x-shockwave-flash"], object[type="application/x-shockwave-flash"], object[classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"]');
        if (!flashElement) { console.warn('Fit Flash: Flash element not found.'); return 'not_found'; }
        
        const shouldFit = ${isFlashFitted};
        
        // Try to find a meaningful container, but don't go too high
        let container = flashElement.parentElement;
        for(let i=0; i<3 && container && container.tagName !== 'BODY'; i++) { 
          if (container.id || container.classList.length > 0) break; // Stop if it's a styled container
          container = container.parentElement; 
        }

        // Styles to apply/revert
        const fitStyles = { position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: '999999', margin: '0', padding: '0', transform: 'none', transformOrigin: 'unset' };
        const revertStyles = { position: '', top: '', left: '', width: '', height: '', zIndex: '', margin: '', padding: '', transform: '', transformOrigin: '' };
        const containerFitStyle = { overflow: 'visible' }; 
        const containerRevertStyle = { overflow: '' };

        if (shouldFit) { 
          Object.assign(flashElement.style, fitStyles); 
          if (container) Object.assign(container.style, containerFitStyle); 
          console.log('Fit Flash: Applying fit styles.'); 
          return 'fitted'; 
        } else { 
          Object.assign(flashElement.style, revertStyles); 
          if (container) Object.assign(container.style, containerRevertStyle); 
          console.log('Fit Flash: Reverting fit styles.'); 
          return 'reverted'; 
        }
      })();
    `;

  // CSS to hide scrollbars when Flash is fitted
  const HIDE_SCROLLBAR_CSS = 'html, body { overflow: hidden !important; }';

  try {
    // Manage Scrollbar CSS injection/removal
    if (isFlashFitted) {
      // If fitting, insert the CSS and store its key
      flashFitCSSKey = await view.webContents.insertCSS(HIDE_SCROLLBAR_CSS);
    } else if (flashFitCSSKey) {
      // If reverting, remove the CSS using the stored key
      if (view && !view.webContents.isDestroyed()) {
        await view.webContents.removeInsertedCSS(flashFitCSSKey);
      }
      flashFitCSSKey = null;
    }

    // Execute the JavaScript to resize/revert the Flash element
    const result = await view.webContents.executeJavaScript(script, true); // Use true for user gesture
    console.log(`Flash fit script execution result: ${result}`);

    // Handle case where element wasn't found *after* attempting to fit
    if (result === 'not_found' && isFlashFitted) {
      isFlashFitted = false; // Revert state
      if (flashFitCSSKey) { // Remove CSS if it was added
        if (view && !view.webContents.isDestroyed()) {
          await view.webContents.removeInsertedCSS(flashFitCSSKey);
        }
        flashFitCSSKey = null;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        dialog.showErrorBox('Fit Flash Error', 'Could not find the Flash element on the current page.');
      }
    }
  } catch (err) {
    console.error("Error executing Flash fit script:", err);
    // Revert state on error
    isFlashFitted = !isFlashFitted; 
    if (!isFlashFitted && flashFitCSSKey) { // Attempt to remove CSS if reverting due to error
      try {
        if (view && !view.webContents.isDestroyed()) {
          await view.webContents.removeInsertedCSS(flashFitCSSKey);
        }
      } catch (removeErr) { /* ignore secondary error */ }
      flashFitCSSKey = null;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox('Fit Flash Error', `An error occurred: ${err.message}`);
    }
  }
}
// === END OF Fit Flash FUNCTION ===


// === Native Menu Template ===
const menuTemplate = [
  {
    label: 'Servers',
    submenu: [
      { label: 'New Club Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.newcp.net/'); } },
      { type: 'separator' },
      { label: 'CPPS.to', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://media.cpps.to/play/'); } },
      { type: 'separator' },
      { label: 'Antique Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.antiquepengu.in/'); } },
      { type: 'separator' },
      { label: 'Club Penguin Zero', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.cpzero.net/'); } },
      { type: 'separator' },
      { label: 'Original Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://old.ogpenguin.online/'); } }
    ]
  },
  {
    label: 'Options',
    submenu: [
      { label: 'Reload', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.reload(); }, accelerator: 'F5' },
      { type: 'separator' },
      { // Electron Window Fullscreen
        label: 'Toggle Fullscreen Window',
        accelerator: 'F11',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        }
      },
      { type: 'separator' },
      { // Experimental Fit Flash
        label: 'Toggle Fit Flash to Window',
        click: toggleFlashFit // Reference the function directly
      },
      { type: 'separator' },
      { // Zoom Controls
        label: 'Zoom In', accelerator: 'CmdOrCtrl+=',
        click: () => {
          if (view && !view.webContents.isDestroyed()) {
            const currentZoom = view.webContents.getZoomFactor();
            const newZoom = Math.min(3.0, currentZoom + 0.1); // Max zoom 300%
            view.webContents.setZoomFactor(newZoom);
            console.log(`Zoom Factor set to: ${newZoom.toFixed(1)}`);
          }
        }
      },
      {
        label: 'Zoom Out', accelerator: 'CmdOrCtrl+-',
        click: () => {
          if (view && !view.webContents.isDestroyed()) {
            const currentZoom = view.webContents.getZoomFactor();
            const newZoom = Math.max(0.5, currentZoom - 0.1); // Min 50%
            view.webContents.setZoomFactor(newZoom);
            console.log(`Zoom Factor set to: ${newZoom.toFixed(1)}`);
          }
        }
      },
      {
        label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0',
        click: () => {
          if (view && !view.webContents.isDestroyed()) {
            view.webContents.setZoomFactor(1.0);
            console.log(`Zoom Factor reset to: 1.0`);
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Clear Data',
        click: clearBrowsingAndFlashData // Reference the function directly
      },
      { type: 'separator' },
      {
        label: 'Check for Updates',
        click: () => {
          // Open the GitHub releases page in the user's default browser
          shell.openExternal('https://github.com/Dragon9135/CPPS-Launcher/releases/latest');
        }
      }
      // DevTools menu added below conditionally
    ]
  },
  {
    label: 'About',
    click: showAboutDialog // Reference the function directly
  }
];

// Add DevTools menu only if running in development mode
if (isDev) {
  const optionsSubmenu = menuTemplate.find(item => item.label === 'Options')?.submenu;
  if (optionsSubmenu) {
    optionsSubmenu.push(
      { type: 'separator' },
      {
        label: 'Toggle Developer Tools',
        click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.toggleDevTools(); },
        accelerator: 'Ctrl+Shift+I'
      }
    );
  }
}

// === Create Main Window ===
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#000000', // Black background while loading
    icon: path.join(__dirname, 'icon.ico'), // Ensure icon.ico is in the same dir
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Ensure preload.js exists
      nodeIntegration: false,    // Security best practice
      contextIsolation: true,    // Security best practice
      enableRemoteModule: false, // Security best practice
      spellcheck: false,
      devTools: false,           // DevTools for main window (index.html) disabled
      sandbox: false             // Required for Flash in Electron 11
    }
  });

  // Handle window closure gracefully
  mainWindow.on('closed', () => {
    app.quit(); // Dereference window object
  });

  // Load the local HTML file for the main window frame
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
      devTools: isDev          // Enable DevTools for the view *only* in dev mode
    }
  });
  mainWindow.setBrowserView(view);

  // Grant Flash permission specifically for the view's session
  view.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'flash') {
      return callback(true); // Always allow Flash
    }
    callback(false); // Deny other permissions
  });

  // Setup auto-resizing and initial size
  view.setAutoResize({ width: true, height: true });
  resizeView(); // Initial size calculation
  mainWindow.on('resize', resizeView); // Recalculate size on window resize

  // Apply ad blocking and header fixes *only* to the view's session
  setupSessionInterceptors(view.webContents.session);

  // === Handle crucial events from the view ===
  view.webContents.on('crashed', (event, killed) => {
    console.error(`BrowserView crashed! Killed: ${killed}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox("Error", "The game view process has crashed. Please try reloading (Options > Reload) or restarting the application.");
    }
    // TODO: Consider automatically destroying and recreating the view
  });

  view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // Ignore aborts potentially caused by user action or our ad blocker
    if (errorCode === -3) { // ERR_ABORTED
      if (BLOCK_LIST.some(blockItem => (validatedURL || '').includes(blockItem))) {
        console.log(`Ad/tracker request blocked (ERR_ABORTED): ${validatedURL}`);
      } else {
        console.warn(`Load aborted (may be intentional): ${validatedURL} (${errorCode})`);
      }
      return;
    }
    
    // Ignore non-critical errors on sub-frames
    if (!isMainFrame) {
      console.warn(`Subframe failed to load: ${validatedURL} (Error: ${errorDescription} / ${errorCode})`);
      return;
    }

    // Log and show error for main frame failures
    console.error(`BrowserView failed to load URL: ${validatedURL} Error: ${errorDescription} (${errorCode})`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox("Load Error", `Failed to load the page: ${validatedURL}\nError: ${errorDescription} (${errorCode})\n\nPlease check your internet connection or try reloading.`);
    }
  });


  // Apply Cosmetic Filter after the page finishes loading
  view.webContents.on('did-finish-load', async () => {
    try {
      if (!view || view.webContents.isDestroyed()) return;
      
      const url = view.webContents.getURL();
      
      // Apply cosmetic filter AND button replacement for newcp.net
      if (url.includes('newcp.net')) {
        await view.webContents.insertCSS(NEWCP_COSMETIC_CSS);
        console.log("Cosmetic filter applied to newcp.net.");
        
        // === START: "Play Now!" button replacement (Internationalized) ===
        
        // Determine button text based on URL language code
        let playButtonText = 'Play Now!'; // Default English
        if (url.includes('/pt-BR/')) {
          playButtonText = 'Jogar!';
        } else if (url.includes('/es-LA/')) {
          playButtonText = '¡Jugar!';
        }

        const replaceButtonScript = `
          (function() {
            try {
              // Find the target "Download App" link.
              const downloadLink = document.querySelector('a.nav-link[href="/download"]');
              
              if (downloadLink) {
                // This text is passed in from the main.js process
                const newText = '${playButtonText}'; 

                // Define the new "Play Now!" button HTML
                const newPlayButtonHTML = \`
                  <a href="/plays?force=true#/login" data-rr-ui-event-key="/plays?force=true#/login" class="nav-link">
                    <button type="submit" id="Navbar_download-btn__6D0hQ" class="btn btn-danger">
                      <div id="Navbar_download-text__FSfPd" style="border: none; position: unset;">\${newText}</div>
                    </button>
                  </a>\`;
                
                // Replace the "Download" link's outer HTML with the new "Play" link HTML
                downloadLink.outerHTML = newPlayButtonHTML;
                console.log('CPPS Launcher: Replaced "Download" button with "' + newText + '" button.');
              } else {
                console.log('CPPS Launcher: "Download" button (a.nav-link[href="/download"]) not found, no replacement made.');
              }
            } catch (e) {
              console.error('CPPS Launcher: Error replacing button:', e);
            }
          })();
        `;
        await view.webContents.executeJavaScript(replaceButtonScript);
        // === END: "Play Now!" button replacement ===
      }
      
      // BUGFIX: Reset Fit Flash state if navigating to a new page
      if (isFlashFitted) {
        console.log("Resetting Fit Flash state due to navigation.");
        if (flashFitCSSKey) {
          try { await view.webContents.removeInsertedCSS(flashFitCSSKey); } catch (e) { /* ignore error */ }
          flashFitCSSKey = null;
        }
        isFlashFitted = false;
      }
    } catch (err) {
      console.error('Error during did-finish-load event:', err);
    }
  });

  // Load the default server URL
  // Set a modern user agent
  view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
  const initialUrl = 'https://newcp.net/en-US/'; // Changed default
  
  try {
    console.log(`Loading initial URL: ${initialUrl}`);
    view.webContents.loadURL(initialUrl);
  } catch (err) {
    console.error("Error loading initial URL:", err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox("Initial Load Error", `Failed to load the starting page: ${initialUrl}\nError: ${err.message}`);
    }
  }

  // Initialize Discord RPC
  initDiscordRPC();

} // End of createWindow function


// === App Lifecycle ===

// Set the app theme (dark/light mode) to match the OS system setting
// Do this before the app is ready
try {
  systemPreferences.themeSource = 'system';
} catch (err) {
  console.warn("Failed to set system theme source:", err.message);
}


// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  // Clean up Discord RPC connection before quitting
  if (rpcReady && rpc) {
    try {
      rpc.destroy().catch(err => console.error("Error destroying RPC on quit:", err));
      console.log("Discord RPC connection closed.");
      rpcReady = false;
    } catch (err) {
      console.error("Error destroying Discord RPC:", err);
    }
  }
  
  // Standard quit behavior
  if (process.platform !== 'darwin') { // 'darwin' is macOS
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked and no other windows are open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Initialize the app when Electron is ready
app.whenReady().then(() => {
  // CRITICAL: Check if Flash plugin exists *before* creating the window
  if (!fs.existsSync(pluginPath)) {
    console.error(`Flash plugin not found at expected path: ${pluginPath}`);
    dialog.showErrorBox("Flash Plugin Error", `Flash plugin (pepflashplayer.dll) not found.\n\nArchitecture: ${arch}\nExpected location:\n${pluginPath}\n\nPlease ensure the plugin is placed correctly in the 'plugins/${arch}' folder next to the application executable.`);
    // Don't create the window if Flash is missing
    app.quit();
    return; 
  } else {
    console.log(`Using Flash plugin found at: ${pluginPath}`);
  }

  createWindow(); // Create window after checks/setup
});

// === Global Error Handling ===
// Handle potential unhandled promise rejections for better stability
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Show an error dialog in production
  if (!isDev && mainWindow && !mainWindow.isDestroyed()) {
    dialog.showErrorBox('Unhandled Error', `An unexpected error occurred (Promise Rejection).\nPlease report this issue.\nDetails: ${reason}`);
  }
});

// Handle uncaught exceptions for better stability
process.on('uncaughtException', (error, origin) => {
  console.error(`Caught exception: ${error}\nException origin: ${origin}`);
  // Prevent showing dialog if app is already shutting down
  if (app.isReady() && mainWindow && !mainWindow.isDestroyed()) {
    dialog.showErrorBox('Unhandled Error', `A critical error occurred: ${error.message}\nOrigin: ${origin}\n\nPlease report this issue.\n${error.stack}`);
  }
  
  // In production, it might be safer to exit after logging
  // if (!isDev) { process.exit(1); }
});



