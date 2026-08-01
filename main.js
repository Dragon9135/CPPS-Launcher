const {
    app,
    BrowserWindow,
    BrowserView,
    session,
    Menu,
    dialog,
    systemPreferences,
    shell
} = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const https = require('https');
const RPC = require('discord-rpc');

const isDev = !app.isPackaged;
const resourcesPath = isDev ? __dirname : process.resourcesPath;
const topMenuHeight = 0;
const arch = process.arch === 'ia32' ? 'x86' : 'x64';
const pluginName = 'pepflashplayer.dll';
const pluginPath = path.join(resourcesPath, 'plugins', arch, pluginName);
const FLASH_VERSION = '34.0.0.376';

const HAGEZI_LIST_URL = 'https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/adblock/ultimate.txt';
const BLOCKLIST_CACHE_PATH = path.join(app.getPath('userData'), 'hagezi-blocklist-cache.json');
const BLOCKLIST_UPDATE_INTERVAL_MS = 1 * 24 * 60 * 60 * 1000;

let mainWindow = null;
let view = null;
let isFlashFitted = false;
let flashFitCSSKey = null;
let isClearingData = false;

let dynamicBlockList = new Set();

const clientId = 'CLIENT_ID';
const rpc = new RPC.Client({ transport: 'ipc' });
let rpcReady = false;
let rpcInterval = null;

async function setDiscordActivity() {
    if (!rpc || !rpcReady) return;
    try {
        await rpc.setActivity({
            details: 'Playing Club Penguin',
            state: 'Exploring the Island',
            startTimestamp: Date.now(),
            largeImageKey: 'logo',
            largeImageText: 'CPPS Launcher',
            instance: false,
        });
    } catch (err) {
        if (err.message.includes('Could not connect') || err.message.includes('disconnected')) {
            rpcReady = false;
            if (rpcInterval) clearInterval(rpcInterval);
            rpcInterval = null;
            setTimeout(() => { if (!rpcReady) initDiscordRPC(); }, 30 * 1000);
        }
    }
}

function initDiscordRPC() {
    if (rpcReady || (rpc.transport && rpc.transport.socket && rpc.transport.socket.readyState === 'open')) return;
    
    rpc.removeAllListeners();
    rpc.on('ready', () => {
        rpcReady = true;
        setDiscordActivity();
        if (rpcInterval) clearInterval(rpcInterval);
        rpcInterval = setInterval(() => { if (rpcReady) setDiscordActivity(); }, 15 * 60 * 1000);
    });
    
    rpc.login({ clientId }).catch(() => {
        rpcReady = false;
        setTimeout(() => { if (!rpcReady) initDiscordRPC(); }, 60 * 1000);
    });
    
    rpc.on('disconnected', () => {
        rpcReady = false;
        if (rpcInterval) clearInterval(rpcInterval);
        rpcInterval = null;
        setTimeout(() => { if (!rpcReady) initDiscordRPC(); }, 60 * 1000);
    });
}

app.commandLine.appendSwitch('disable-features', [
    'MediaRouter', 'CalculateNativeWinOcclusion', 'OptimizationGuideModelDownloading',
    'InterestFeedContentSuggestions', 'InterestFeedSparePrefetch', 'GlobalMediaControls',
    'TabHoverCards', 'TabHoverCardImages', 'UseEcoQoSForBackgroundProcess',
    'CanvasOOPRasterization', 'SurfaceControl', 'DirectManipulationStylus'
].join(','));

app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('ppapi-flash-path', pluginPath);
app.commandLine.appendSwitch('ppapi-flash-version', FLASH_VERSION);
app.commandLine.appendSwitch('allow-outdated-plugins');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-threaded-compositing');
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-print-preview');
app.commandLine.appendSwitch('disable-client-side-phishing-detection');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-audio-input');
app.commandLine.appendSwitch('disable-video-capture');
app.commandLine.appendSwitch('no-pings');
app.commandLine.appendSwitch('process-per-site');
app.commandLine.appendSwitch('renderer-process-limit', '3');
app.commandLine.appendSwitch('dom-storage-enabled', 'true');

const MANUAL_BLOCK_LIST = [
    'googlesyndication.com', 'googleadservices.com', 'doubleclick.net',
    'ads.pubmatic.com', 'adnxs.com', 'rubiconproject.com', 'openx.net', 'criteo.com',
    'taboola.com', 'outbrain.com', 'amazon-adsystem.com', 'adsrvr.org', 'bidswitch.net',
    'popads.net', 'propellerads.com', 'adsterra.com', 'google-analytics.com',
    'analytics.google.com', 'googletagmanager.com', 'facebook.net', 'connect.facebook.net',
    'scorecardresearch.com', 'quantserve.com', 'adobedtm.com', 'hotjar.com', 'moatads.com',
    'serving-sys.com', 'advertising.com', 'adform.net', 'adroll.com', 'yieldmo.com',
    'twitter.com', 'static.ads-twitter.com', 'analytics.twitter.com',
    'snapads.com', 'tiktokads.com', 'business.tiktok.com',
    'bugsnag.com', 'clarity.ms', 'mouseflow.com', 'fullstory.com'
];

const WHITELIST = new Set([
    'cpzero.net', 'play.cpzero.net',
    'cpdimensions.com', 'play.cpdimensions.com',
    'aventurepingouin.com',
    'antiquepengu.in', 'play.antiquepengu.in',
    'ogpenguin.online', 'old.ogpenguin.online',
    'cpatake.boo', 'app.cpatake.boo',
    'fluffypenguin.xyz', 'play.fluffypenguin.xyz',
    'cpps.app', 'play.cpps.app',
    'cpps.to', 'media.cpps.to', 'play.cpps.to',
    'waddleworld.site', 'play.waddleworld.site',
    'macromedia.com', 'adobe.com',
    'github.com', 'githubusercontent.com',
    'jsdelivr.net',
    'controld.com', 'freedns.controld.com',
    'challenges.cloudflare.com', 'turnstile.com'
]);

function parseAdblockList(text) {
    const domains = new Set();
    const lines = text.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#') || trimmed.startsWith('[')) continue;
        if (trimmed.startsWith('@@')) continue;
        if (trimmed.startsWith('/') || trimmed.includes('/')) continue;
        
        if (trimmed.startsWith('||')) {
            let domain = trimmed.substring(2);
            domain = domain.replace(/[\^\$\*].*$/, '');
            domain = domain.replace(/[\/:].*$/, '');
            domain = domain.toLowerCase().trim();
            
            if (domain && domain.length > 2 && domain.includes('.') && !domain.includes('*')) {
                domains.add(domain);
            }
        }
        else if (trimmed.startsWith('|') && !trimmed.startsWith('||')) {
            let domain = trimmed.substring(1);
            domain = domain.replace(/^https?:\/\//, '');
            domain = domain.replace(/[\^\$\*\/:].*$/, '');
            domain = domain.toLowerCase().trim();
            
            if (domain && domain.length > 2 && domain.includes('.')) {
                domains.add(domain);
            }
        }
    }
    return domains;
}

function downloadBlockList() {
    return new Promise((resolve, reject) => {
        const request = https.get(HAGEZI_LIST_URL, { timeout: 30000 }, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            response.on('error', reject);
        });
        
        request.on('error', reject);
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Timeout'));
        });
    });
}

async function loadCachedBlockList() {
    try {
        const cacheData = await fsPromises.readFile(BLOCKLIST_CACHE_PATH, 'utf-8');
        const cache = JSON.parse(cacheData);
        
        if (Date.now() - cache.timestamp < BLOCKLIST_UPDATE_INTERVAL_MS) {
            return { domains: new Set(cache.domains), fromCache: true, needsUpdate: false };
        }
        return { domains: new Set(cache.domains), fromCache: true, needsUpdate: true };
    } catch (err) {
        return { domains: new Set(), fromCache: false, needsUpdate: true };
    }
}

async function saveBlockListToCache(domains) {
    try {
        const cache = {
            timestamp: Date.now(),
            count: domains.size,
            domains: Array.from(domains)
        };
        await fsPromises.writeFile(BLOCKLIST_CACHE_PATH, JSON.stringify(cache), 'utf-8');
    } catch (err) {
        console.warn('Failed to save blocklist cache:', err.message);
    }
}

function applyWhitelist(blockSet) {
    WHITELIST.forEach(domain => blockSet.delete(domain));
    return blockSet;
}

async function updateBlockList() {
    const cached = await loadCachedBlockList();
    
    if (cached.domains.size > 0) {
        dynamicBlockList = new Set([...cached.domains, ...MANUAL_BLOCK_LIST]);
        applyWhitelist(dynamicBlockList);
        console.log(`Blocklist loaded from cache: ${dynamicBlockList.size.toLocaleString()} domains`);
    } else {
        dynamicBlockList = new Set(MANUAL_BLOCK_LIST);
        applyWhitelist(dynamicBlockList);
        console.log('Using manual fallback blocklist');
    }
    
    if (cached.needsUpdate || !cached.fromCache) {
        setTimeout(async () => {
            try {
                console.log('Downloading HaGeZi Ultimate blocklist...');
                const text = await downloadBlockList();
                const parsed = parseAdblockList(text);
                
                if (parsed.size > 1000) {
                    dynamicBlockList = new Set([...parsed, ...MANUAL_BLOCK_LIST]);
                    applyWhitelist(dynamicBlockList);
                    await saveBlockListToCache(dynamicBlockList);
                    console.log(`Blocklist updated: ${dynamicBlockList.size.toLocaleString()} domains active`);
                    
                    if (view && view.webContents && !view.webContents.isDestroyed()) {
                        setupSessionInterceptors(view.webContents.session);
                    }
                } else {
                    console.warn(`Downloaded list too small (${parsed.size}), keeping cache`);
                }
            } catch (err) {
                console.warn('Blocklist update failed, using cache:', err.message);
            }
        }, 5000);
    }
}

function extractHostname(url) {
    const start = url.indexOf('://') + 3;
    if (start < 3) return '';
    let end = url.indexOf('/', start);
    if (end === -1) end = url.indexOf('?', start);
    if (end === -1) end = url.length;
    const host = url.substring(start, end);
    const colonPos = host.lastIndexOf(':');
    return colonPos > -1 ? host.substring(0, colonPos) : host;
}

function isBlockedHostname(hostname) {
    if (dynamicBlockList.has(hostname)) return true;
    
    const parts = hostname.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
        const parentDomain = parts.slice(i).join('.');
        if (dynamicBlockList.has(parentDomain)) {
            return true;
        }
    }
    return false;
}

function setupSessionInterceptors(sess) {
    if (!sess) return;
    sess.webRequest.onHeadersReceived((details, callback) => {
        try {
            const headers = { ...details.responseHeaders };
            const relevantTypes = ['main_frame', 'sub_frame', 'object'];
            if (relevantTypes.includes(details.resourceType)) {
                for (const key of Object.keys(headers)) {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey === 'x-frame-options') {
                        delete headers[key];
                    } else if (lowerKey === 'content-security-policy') {
                        const originalValue = Array.isArray(headers[key]) ? headers[key][0] : headers[key];
                        headers[key] = [(originalValue || '').split(';').filter(d => !d.trim().startsWith('frame-ancestors')).join(';')];
                    }
                }
            }
            callback({ responseHeaders: headers });
        } catch (err) {
            callback({});
        }
    });
    
    sess.webRequest.onBeforeRequest((details, callback) => {
        const url = details.url || '';
        const hostname = extractHostname(url).toLowerCase();
        if (!hostname) {
            callback({ cancel: false });
            return;
        }
        
        if (WHITELIST.has(hostname)) {
            callback({ cancel: false });
            return;
        }
        
        callback({ cancel: isBlockedHostname(hostname) });
    });
}

function resizeView() {
    if (!mainWindow || mainWindow.isDestroyed() || !view || view.webContents.isDestroyed()) return;
    try {
        const [windowWidth, windowHeight] = mainWindow.getContentSize();
        view.setBounds({
            x: 0,
            y: topMenuHeight,
            width: windowWidth,
            height: windowHeight - topMenuHeight
        });
    } catch (err) {}
}

function showAboutDialog() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const appVersion = app.getVersion();
    const electronVersion = process.versions.electron;
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'About',
        message: `CPPS Launcher v${appVersion}`,
        detail: `Created by Dragon9135.\n\nElectron: ${electronVersion}\nClean Flash Player: ${FLASH_VERSION} (x86/x64)\nBlocklist: ${dynamicBlockList.size.toLocaleString()} domains\nNode.js (Build): 18.20.8\n\nThis is an open-source project developed for hobby purposes.`,
        buttons: ['OK']
    });
}

async function clearBrowsingAndFlashData() {
    if (isClearingData) return;
    isClearingData = true;
    try {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const confirmation = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'Confirm Data Clearing',
            message: 'Clear browsing data and Flash Player data?',
            detail: 'This will remove cache, cookies, local storage, and Flash Player saved data (LSOs). Logins and site settings might be lost. The current page will reload after clearing.',
            buttons: ['Clear Data', 'Cancel'],
            defaultId: 1,
            cancelId: 1
        });
        if (confirmation.response === 1) return;

        let flashDataCleared = false;
        let browsingDataCleared = false;
        let flashError = null;
        let browsingError = null;

        const userDataPath = app.getPath('userData');
        const flashDataPath = path.join(userDataPath, 'Pepper Data');
        
        try {
            await fsPromises.stat(flashDataPath);
            await fsPromises.rmdir(flashDataPath, { recursive: true, maxRetries: 3 });
            flashDataCleared = true;
        } catch (err) {
            if (err.code === 'ENOENT') flashDataCleared = true;
            else flashError = err;
        }

        if (view && view.webContents && !view.webContents.isDestroyed()) {
            try {
                const electronSession = view.webContents.session;
                const storageOptions = {
                    storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
                    origin: '*'
                };
                await Promise.all([
                    electronSession.clearCache(),
                    electronSession.clearStorageData(storageOptions)
                ]);
                browsingDataCleared = true;
            } catch (err) {
                browsingError = err;
            }
        } else {
            if (flashDataCleared) browsingDataCleared = true;
        }

        let finalTitle, finalMessage, finalDetail, finalType = 'info';
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

        if (mainWindow && !mainWindow.isDestroyed()) {
            dialog.showMessageBox(mainWindow, {
                type: finalType, title: finalTitle, message: finalMessage, detail: finalDetail, buttons: ['OK']
            }).then(() => {
                if (view && !view.webContents.isDestroyed()) view.webContents.reloadIgnoringCache();
            });
        }
    } finally {
        isClearingData = false;
    }
}

async function toggleFlashFit() {
    if (!view || !view.webContents || view.webContents.isDestroyed()) return;
    const previousState = isFlashFitted;
    isFlashFitted = !isFlashFitted;
    
    const script = `
      (function() {
        const flashElement = document.querySelector('embed[type="application/x-shockwave-flash"], object[type="application/x-shockwave-flash"], object[classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"]');
        if (!flashElement) return 'not_found';
        const shouldFit = ${isFlashFitted};
        let container = flashElement.parentElement;
        for(let i=0; i<3 && container && container.tagName !== 'BODY'; i++) { 
          if (container.id || container.classList.length > 0) break; 
          container = container.parentElement; 
        }
        const fitStyles = { position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: '999999', margin: '0', padding: '0', transform: 'none', transformOrigin: 'unset' };
        const revertStyles = { position: '', top: '', left: '', width: '', height: '', zIndex: '', margin: '', padding: '', transform: '', transformOrigin: '' };
        if (shouldFit) { 
          Object.assign(flashElement.style, fitStyles); 
          if (container) Object.assign(container.style, { overflow: 'visible' }); 
          return 'fitted'; 
        } else { 
          Object.assign(flashElement.style, revertStyles); 
          if (container) Object.assign(container.style, { overflow: '' }); 
          return 'reverted'; 
        }
      })();
    `;
    const HIDE_SCROLLBAR_CSS = 'html, body { overflow: hidden !important; }';
    
    try {
        if (isFlashFitted) {
            flashFitCSSKey = await view.webContents.insertCSS(HIDE_SCROLLBAR_CSS);
        } else if (flashFitCSSKey) {
            await view.webContents.removeInsertedCSS(flashFitCSSKey);
            flashFitCSSKey = null;
        }
        const result = await view.webContents.executeJavaScript(script, true);
        if (result === 'not_found' && isFlashFitted) {
            isFlashFitted = false;
            if (flashFitCSSKey) {
                await view.webContents.removeInsertedCSS(flashFitCSSKey);
                flashFitCSSKey = null;
            }
            if (mainWindow && !mainWindow.isDestroyed()) {
                dialog.showMessageBox(mainWindow, {
                    type: 'error',
                    title: 'Fit Flash Error',
                    message: 'Could not find the Flash element on the current page.',
                    buttons: ['OK']
                });
            }
        }
    } catch (err) {
        isFlashFitted = previousState;
        if (!isFlashFitted && flashFitCSSKey) {
            try { await view.webContents.removeInsertedCSS(flashFitCSSKey); } catch (e) {}
            flashFitCSSKey = null;
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
            dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Fit Flash Error',
                message: `An error occurred: ${err.message}`,
                buttons: ['OK']
            });
        }
    }
}

const menuTemplate = [
    {
        label: 'Servers',
        submenu: [
            { label: 'Club Penguin Zero', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.cpzero.net/').catch(() => {}); } },
            { type: 'separator' },
            { label: 'Club Penguin Dimensions', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.cpdimensions.com/pt/#/login').catch(() => {}); } },
            { type: 'separator' },
            { label: 'Aventure Pingouin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://aventurepingouin.com/viens-jouer/').catch(() => {}); } },
            { type: 'separator' },
            { label: 'Antique Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.antiquepengu.in/').catch(() => {}); } },
            { type: 'separator' },
            { label: 'Original Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://old.ogpenguin.online/').catch(() => {}); } },
            { type: 'separator' },
            { label: 'Club Penguin Atake', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://app.cpatake.boo/').catch(() => {}); } },
            { type: 'separator' },
            { label: 'Fluffy Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.fluffypenguin.xyz/en/#/login').catch(() => {}); } },
            { type: 'separator' },
            { label: 'CPPS.app', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.cpps.app/#/login').catch(() => {}); } },
            { type: 'separator' },
            { label: 'CPPS.to', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://media.cpps.to/play/').catch(() => {}); } },
            { type: 'separator' },
            { label: 'Waddle World', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.waddleworld.site/').catch(() => {}); } }
        ]
    },
    {
        label: 'Options',
        submenu: [
            { label: 'Reload', accelerator: 'F5', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.reload(); } },
            { type: 'separator' },
            { label: 'Toggle Fullscreen Window', accelerator: 'F11', click: () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setFullScreen(!mainWindow.isFullScreen()); } },
            { type: 'separator' },
            { label: 'Toggle Fit Flash to Window', click: toggleFlashFit },
            { type: 'separator' },
            { label: 'Flash Player General Settings', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager02.html').catch(() => {}); } },
            { type: 'separator' },
            { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.setZoomFactor(Math.min(3.0, view.webContents.getZoomFactor() + 0.1)); } },
            { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.setZoomFactor(Math.max(0.5, view.webContents.getZoomFactor() - 0.1)); } },
            { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.setZoomFactor(1.0); } },
            { type: 'separator' },
            { label: 'Clear Data', click: clearBrowsingAndFlashData },
            { type: 'separator' },
            { label: 'Check for Updates', click: () => shell.openExternal('https://github.com/Dragon9135/CPPS-Launcher/releases/latest') }
        ]
    },
    { label: 'About', click: showAboutDialog }
];

function resetFlashFitState() {
    if (isFlashFitted) {
        if (flashFitCSSKey) {
            try {
                if (view && !view.webContents.isDestroyed()) {
                    view.webContents.removeInsertedCSS(flashFitCSSKey);
                }
            } catch (e) {}
            flashFitCSSKey = null;
        }
        isFlashFitted = false;
    }
}

const GLOBAL_HIDE_SCROLLBAR_CSS = `
    ::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
    }
    html, body {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
    }
`;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 960, height: 640, minWidth: 900, minHeight: 600,
        backgroundColor: '#000000',
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, contextIsolation: true, enableRemoteModule: false,
            spellcheck: false, devTools: false, sandbox: false
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        app.quit();
    });
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    view = new BrowserView({
        webPreferences: { nodeIntegration: false, contextIsolation: true, plugins: true, sandbox: false, devTools: false }
    });
    mainWindow.setBrowserView(view);
    view.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = [
            'flash',
            'clipboard-read',
            'clipboard-sanitized-write',
            'media',
            'mediaKeySystem',
            'geolocation',
            'notifications'
        ];
        callback(allowedPermissions.includes(permission));
    });

    view.webContents.session.setPermissionCheckHandler((webContents, permission) => {
        const allowedPermissions = [
            'flash',
            'clipboard-read',
            'clipboard-sanitized-write',
            'media',
            'mediaKeySystem'
        ];
        return allowedPermissions.includes(permission);
    });
    
    resizeView();
    mainWindow.on('resize', resizeView);
    setupSessionInterceptors(view.webContents.session);

    view.webContents.on('dom-ready', () => {
        if (!view || view.webContents.isDestroyed()) return;

        view.webContents.insertCSS(GLOBAL_HIDE_SCROLLBAR_CSS).catch(() => {});

        const antiBotScript = `
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            window.chrome = window.chrome || { runtime: {} };
        `;
        view.webContents.executeJavaScript(antiBotScript).catch(() => {});
    });

    view.webContents.on('crashed', (event, killed) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('view/crashed');
            dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Error',
                message: 'The game view process has crashed.',
                detail: 'Please try reloading (Options > Reload) or restarting the application.',
                buttons: ['OK']
            });
        }
    });

    view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (errorCode === -3) {
            const hostname = extractHostname(validatedURL || '').toLowerCase();
            if (WHITELIST.has(hostname)) return;
            if (isBlockedHostname(hostname)) return;
        }
        if (!isMainFrame) return;
        
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('view/load-failed', { errorCode, errorDescription, validatedURL });
            dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Load Error',
                message: `Failed to load the page: ${validatedURL}`,
                detail: `Error: ${errorDescription} (${errorCode})\n\nPlease check your internet connection or try reloading.`,
                buttons: ['OK']
            });
        }
    });

    view.webContents.on('did-finish-load', () => {
        if (!view || view.webContents.isDestroyed()) return;
        resetFlashFitState();
    });
    
    view.webContents.on('did-navigate-in-page', (event, url, isMainFrame) => {
        if (isMainFrame && view && !view.webContents.isDestroyed()) resetFlashFitState();
    });

    view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const initialUrl = 'about:blank';
    view.webContents.loadURL(initialUrl).catch(err => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Initial Load Error',
                message: `Failed to load the starting page: ${initialUrl}`,
                detail: err.message,
                buttons: ['OK']
            });
        }
    });

    initDiscordRPC();
}

try { systemPreferences.themeSource = 'system'; } catch (err) {}

app.on('window-all-closed', () => {
    if (rpcReady && rpc) {
        try { rpc.destroy().catch(() => {}); } catch (err) {}
    }
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(async () => {
    if (!fs.existsSync(pluginPath)) {
        dialog.showMessageBox({
            type: 'error',
            title: 'Flash Plugin Error',
            message: 'Flash plugin (pepflashplayer.dll) not found.',
            detail: `Architecture: ${arch}\nExpected location:\n${pluginPath}\n\nPlease ensure the plugin is placed correctly.`,
            buttons: ['OK']
        }).then(() => {
            app.quit();
        });
        return;
    }
    
    await updateBlockList();
    
    createWindow();
});

process.on('unhandledRejection', (reason) => {
    if (!isDev && mainWindow && !mainWindow.isDestroyed()) {
        const reasonText = reason instanceof Error ? reason.message : String(reason);
        dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Unhandled Error',
            message: 'An unexpected error occurred (Promise Rejection).',
            detail: `Details: ${reasonText}`,
            buttons: ['OK']
        });
    }
});

process.on('uncaughtException', (error, origin) => {
    if (app.isReady() && mainWindow && !mainWindow.isDestroyed()) {
        dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Unhandled Error',
            message: 'A critical error occurred.',
            detail: `${error.message}\nOrigin: ${origin}\n\n${error.stack}`,
            buttons: ['OK']
        }).then(() => {
            app.quit();
        });
    }
});
