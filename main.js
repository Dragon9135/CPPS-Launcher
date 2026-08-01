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
const RPC = require('discord-rpc');

const isDev = !app.isPackaged;
const resourcesPath = isDev ? __dirname : process.resourcesPath;
const topMenuHeight = 0;
const arch = process.arch === 'ia32' ? 'x86' : 'x64';
const pluginName = 'pepflashplayer.dll';
const pluginPath = path.join(resourcesPath, 'plugins', arch, pluginName);
const FLASH_VERSION = '34.0.0.376';

let mainWindow = null;
let view = null;
let isFlashFitted = false;
let flashFitCSSKey = null;
let isClearingData = false;

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

const BLOCK_LIST = [
    'googlesyndication.com', 'googleadservices.com', 'doubleclick.net',
    'ads.pubmatic.com', 'adnxs.com', 'rubiconproject.com', 'openx.net', 'criteo.com',
    'taboola.com', 'outbrain.com', 'amazon-adsystem.com', 'adsrvr.org', 'bidswitch.net',
    'popads.net', 'propellerads.com', 'adsterra.com', 'google-analytics.com',
    'analytics.google.com', 'googletagmanager.com', 'facebook.net', 'connect.facebook.net',
    'scorecardresearch.com', 'quantserve.com', 'adobedtm.com', 'hotjar.com', 'moatads.com',
    'serving-sys.com', 'advertising.com', 'adform.net', 'adroll.com', 'yieldmo.com',
    'contextweb.com', 'revcontent.com', 'skimresources.com', 'mookie1.com',
    'fingerprintjs.com', 'privacy-center.org', 'fingerprint.com', 'fingerprintjs.io',
    'sessioncam.com', 'smartlook.com', 'contentsquare.net', 'usercentrics.eu',
    'intercom.io', 'intercomcdn.com', 'clarity.ms', 'mouseflow.com', 'fullstory.com',
    'twitter.com', 'static.ads-twitter.com', 'analytics.twitter.com',
    'snapads.com', 'tiktokads.com', 'business.tiktok.com',
    'omtrdc.net', 'demdex.net', 'adobedc.net', 'everesttech.net',
    'stats.wp.com', 'mixpanel.com', 'amplitude.com', 'logrocket.com', 'segment.io',
    'datadoghq.com', 'newrelic.com', 'nr-data.net', 'bugsnag.com',
    'yandexadexchange.net', 'realsrv.com', 'inmobi.com', 'trafmag.com', 'exdynsrv.com',
    'dynamicadx.com', 'clickaine.com', 'adkernel.com', 'clickadu.com', 'hilltopads.net',
    'onclkds.com', 'shorte.st', 'exoclick.com', 'redirectvoluum.com',
    'affec.tv', 'affiliatly.com', 'tradedoubler.com',
    'adtago.s3.amazonaws.com', 'analyticsengine.s3.amazonaws.com',
    'analytics.s3.amazonaws.com', 'advice-ads.s3.amazonaws.com',
    'pagead2.googlesyndication.com', 'adservice.google.com',
    'pagead2.googleadservices.com', 'afs.googlesyndication.com',
    'stats.g.doubleclick.net', 'ad.doubleclick.net', 'static.doubleclick.net',
    'm.doubleclick.net', 'mediavisor.doubleclick.net', 'ads30.adcolony.com',
    'adc3-launch.adcolony.com', 'events3alt.adcolony.com', 'wd.adcolony.com',
    'static.media.net', 'media.net', 'adservetx.media.net',
    'click.googleanalytics.com', 'ssl.google-analytics.com', 'adm.hotjar.com',
    'identify.hotjar.com', 'insights.hotjar.com', 'script.hotjar.com',
    'surveys.hotjar.com', 'careers.hotjar.com', 'events.hotjar.io',
    'cdn.mouseflow.com', 'o2.mouseflow.com', 'gtm.mouseflow.com',
    'api.mouseflow.com', 'tools.mouseflow.com', 'cdn-test.mouseflow.com',
    'freshmarketer.com', 'claritybt.freshmarketer.com', 'fwtracks.freshmarketer.com',
    'luckyorange.com', 'api.luckyorange.com', 'realtime.luckyorange.com',
    'cdn.luckyorange.com', 'w1.luckyorange.com', 'upload.luckyorange.net',
    'cs.luckyorange.net', 'settings.luckyorange.net', 'notify.bugsnag.com',
    'sessions.bugsnag.com', 'api.bugsnag.com', 'app.bugsnag.com',
    'browser.sentry-cdn.com', 'app.getsentry.com', 'pixel.facebook.com',
    'an.facebook.com', 'ads-api.twitter.com', 'ads.linkedin.com',
    'analytics.pointdrive.linkedin.com', 'ads.pinterest.com',
    'log.pinterest.com', 'analytics.pinterest.com', 'trk.pinterest.com',
    'events.reddit.com', 'events.redditmedia.com', 'ads.youtube.com',
    'ads-api.tiktok.com', 'analytics.tiktok.com', 'ads-sg.tiktok.com',
    'analytics-sg.tiktok.com', 'business-api.tiktok.com', 'ads.tiktok.com',
    'log.byteoversea.com', 'ads.yahoo.com', 'analytics.yahoo.com',
    'geo.yahoo.com', 'udcm.yahoo.com', 'analytics.query.yahoo.com',
    'partnerads.ysm.yahoo.com', 'log.fc.yahoo.com', 'gemini.yahoo.com',
    'adtech.yahooinc.com', 'extmaps-api.yandex.net', 'appmetrica.yandex.ru',
    'adfstat.yandex.ru', 'metrika.yandex.ru', 'offerwall.yandex.net',
    'adfox.yandex.ru', 'auction.unityads.unity3d.com',
    'webview.unityads.unity3d.com', 'config.unityads.unity3d.com',
    'adserver.unityads.unity3d.com', 'iot-eu-logser.realme.com',
    'iot-logser.realme.com', 'bdapi-ads.realmemobile.com',
    'bdapi-in-ads.realmemobile.com', 'api.ad.xiaomi.com',
    'data.mistat.xiaomi.com', 'data.mistat.india.xiaomi.com',
    'data.mistat.rus.xiaomi.com', 'sdkconfig.ad.xiaomi.com',
    'sdkconfig.ad.intl.xiaomi.com', 'tracking.rus.miui.com',
    'adsfs.oppomobile.com', 'adx.ads.oppomobile.com',
    'ck.ads.oppomobile.com', 'data.ads.oppomobile.com',
    'metrics.data.hicloud.com', 'metrics2.data.hicloud.com',
    'grs.hicloud.com', 'logservice.hicloud.com', 'logservice1.hicloud.com',
    'logbak.hicloud.com', 'click.oneplus.cn', 'open.oneplus.net',
    'samsungads.com', 'smetrics.samsung.com', 'nmetrics.samsung.com',
    'samsung-com.112.2o7.net', 'analytics-api.samsunghealthcn.com',
    'iadsdk.apple.com', 'metrics.icloud.com', 'metrics.mzstatic.com',
    'api-adservices.apple.com', 'books-analytics-events.apple.com',
    'weather-analytics-events.apple.com', 'notes-analytics-events.apple.com'
];

const BLOCKED_DOMAINS = new Set(BLOCK_LIST);

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
        let shouldBlock = false;
        if (BLOCKED_DOMAINS.has(hostname)) {
            shouldBlock = true;
        } else {
            for (const domain of BLOCKED_DOMAINS) {
                if (hostname.endsWith('.' + domain)) {
                    shouldBlock = true;
                    break;
                }
            }
        }
        callback({ cancel: shouldBlock });
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
        detail: `Created by Dragon9135.\n\nElectron: ${electronVersion}\nClean Flash Player: ${FLASH_VERSION} (x86/x64)\nNode.js (Build): 18.20.8\n\nThis is an open-source project developed for hobby purposes.`,
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
            { label: 'Club Penguin Zero', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.cpzero.net/'); } },
            { type: 'separator' },
            { label: 'Club Penguin Dimensions', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.cpdimensions.com/pt/#/login'); } },
            { type: 'separator' },
            { label: 'Aventure Pingouin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://aventurepingouin.com/viens-jouer/'); } },
            { type: 'separator' },
            { label: 'Antique Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.antiquepengu.in/'); } },
            { type: 'separator' },
            { label: 'Original Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://old.ogpenguin.online/'); } },
            { type: 'separator' },
            { label: 'Club Penguin Atake', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://app.cpatake.boo/'); } },
            { type: 'separator' },
            { label: 'Fluffy Penguin', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.fluffypenguin.xyz/en/#/login'); } },
            { type: 'separator' },
            { label: 'CPPS.app', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.cpps.app/#/login'); } },
            { type: 'separator' },
            { label: 'CPPS.to', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://media.cpps.to/play/'); } },
            { type: 'separator' },
            { label: 'Waddle World', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.waddleworld.site/'); } }
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
            { label: 'Flash Player General Settings', click: () => { if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager02.html'); } },
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
            Object.defineProperty(navigator, 'languages', { get: () => ['tr-TR', 'tr', 'en-US', 'en'] });
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
            if (BLOCKED_DOMAINS.has(hostname) || Array.from(BLOCKED_DOMAINS).some(domain => hostname.endsWith('.' + domain))) {
                return;
            }
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

app.whenReady().then(() => {
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
    createWindow();
});

process.on('unhandledRejection', (reason) => {
    if (!isDev && mainWindow && !mainWindow.isDestroyed()) {
        dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Unhandled Error',
            message: 'An unexpected error occurred (Promise Rejection).',
            detail: `Details: ${reason}`,
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
