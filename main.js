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
const {
    promises: fsPromises,
    existsSync
} = require('fs');
const RPC = require('discord-rpc');

const isDev = !app.isPackaged;
const resourcesPath = isDev ? __dirname : process.resourcesPath;
const topMenuHeight = 0;

const arch = process.arch === 'ia32' ? 'x86' : 'x64';
const pluginName = 'pepflashplayer.dll';
const pluginPath = path.join(resourcesPath, 'plugins', arch, pluginName);

let mainWindow = null;
let view = null;
let isFlashFitted = false;
let flashFitCSSKey = null;

const clientId = 'CLIENT_ID';
const rpc = new RPC.Client({
    transport: 'ipc'
});
let rpcReady = false;
let rpcInterval = null;

async function setDiscordActivity() {
    if (!rpc || !rpcReady) {
        return;
    }

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
        console.error("Failed to set Discord activity:", err);

        if (err.message.includes('Could not connect') || err.message.includes('disconnected')) {
            rpcReady = false;
            if (rpcInterval) clearInterval(rpcInterval);
            rpcInterval = null;
            console.log("Discord RPC connection lost. Attempting reconnection...");

            setTimeout(() => {
                if (!rpcReady) initDiscordRPC();
            }, 30 * 1000);
        }
    }
}

function initDiscordRPC() {

    if (rpcReady || (rpc.transport && rpc.transport.socket && rpc.transport.socket.readyState === 'open')) {
        return;
    }

    rpc.removeAllListeners();

    rpc.on('ready', () => {
        console.log('Discord RPC is ready.');
        rpcReady = true;
        setDiscordActivity();

        if (rpcInterval) clearInterval(rpcInterval);

        rpcInterval = setInterval(() => {
            if (rpcReady) setDiscordActivity();
        }, 15 * 60 * 1000);
    });

    rpc.login({
        clientId
    }).catch(err => {
        console.error("Discord RPC login failed (Discord might be closed):", err.message);
        rpcReady = false;

        setTimeout(() => {
            if (!rpcReady) initDiscordRPC();
        }, 60 * 1000);
    });

    rpc.on('disconnected', () => {
        console.log('Discord RPC disconnected.');
        rpcReady = false;
        if (rpcInterval) clearInterval(rpcInterval);
        rpcInterval = null;

        setTimeout(() => {
            if (!rpcReady) initDiscordRPC();
        }, 60 * 1000);
    });
}

app.commandLine.appendSwitch('disable-features', [
    'MediaRouter',
    'CalculateNativeWinOcclusion',
    'OptimizationGuideModelDownloading',
    'InterestFeedContentSuggestions',
    'InterestFeedSparePrefetch',
    'GlobalMediaControls',
    'TabHoverCards',
    'TabHoverCardImages',
    'UseEcoQoSForBackgroundProcess',
    'CanvasOOPRasterization',
    'SurfaceControl',
    'DirectManipulationStylus'
].join(','));

app.commandLine.appendSwitch('ppapi-flash-path', pluginPath);
app.commandLine.appendSwitch('ppapi-flash-version', '34.0.0.330');
app.commandLine.appendSwitch('allow-outdated-plugins');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-threaded-compositing');
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('disable-smooth-scrolling');
app.commandLine.appendSwitch('disable-distance-field-text');
app.commandLine.appendSwitch('disable-lcd-text');
app.commandLine.appendSwitch('disable-font-subpixel-positioning');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-print-preview');
app.commandLine.appendSwitch('disable-client-side-phishing-detection');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-webrtc');
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
    'twitter.com', 't.co', 'static.ads-twitter.com', 'analytics.twitter.com',
    'snapads.com', 'tiktokads.com', 'business.tiktok.com',
    'omtrdc.net', 'demdex.net', 'adobedc.net', 'everesttech.net',
    'stats.wp.com', 'mixpanel.com', 'amplitude.com', 'logrocket.com', 'segment.io',
    'datadoghq.com', 'newrelic.com', 'nr-data.net', 'bugsnag.com',
    'yandexadexchange.net', 'realsrv.com', 'inmobi.com', 'trafmag.com', 'exdynsrv.com',
    'dynamicadx.com', 'clickaine.com', 'adkernel.com', 'clickadu.com', 'hilltopads.net',
    'onclkds.com', 'shorte.st', 'exoclick.com', 'redirectvoluum.com', 'trk',
    'affec.tv', 'affiliatly.com', 'tradedoubler.com',
    'adobe.com', 'marketing.adobe.com', 'assets.adobe.com', 'experiencecloud.adobe.com',
    'experience.adobe.com', 'adobe-marketing-cloud.com', 'adobedc.com', 'adobedc.net',
    'adobeid.com', 'adobelogin.com', 'ims-na1.adobelogin.com', 'ims-eu1.adobelogin.com',
    'adobe-analytics.com', 'metrics.adobe.com', 'adobemarketingcloud.com',
    '2o7.net', 'sc.omtrdc.net', 'adobedc.services', 'adobe-fonts.net',
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

const NEWCP_COSMETIC_CSS = `
  #newcp_net_160x600_left_sticky,
  #newcp_net_160x600_right_sticky,
  [style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;"] {
    display: none !important; visibility: hidden !important; width: 0 !important;
    height: 0 !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important;
  }
`;

function setupSessionInterceptors(sess) {
    if (!sess) return;

    sess.webRequest.onHeadersReceived((details, callback) => {
        try {
            const headers = {
                ...details.responseHeaders
            };
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
            callback({
                responseHeaders: headers
            });
        } catch (err) {
            console.error("Error modifying headers:", err);
            callback({});
        }
    });

    sess.webRequest.onBeforeRequest((details, callback) => {
        const url = (details.url || '').toLowerCase();

        const shouldBlock = BLOCK_LIST.some(domain => url.includes(domain));
        callback({
            cancel: shouldBlock
        });
    });
}

function resizeView() {
    if (!mainWindow || mainWindow.isDestroyed() || !view || view.webContents.isDestroyed()) {
        return;
    }

    try {
        const [windowWidth, windowHeight] = mainWindow.getContentSize();
        view.setBounds({
            x: 0,
            y: topMenuHeight,
            width: windowWidth,
            height: windowHeight - topMenuHeight
        });
    } catch (err) {
        console.error("Error resizing BrowserView:", err);
    }
}

function showAboutDialog() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const appVersion = app.getVersion();
    const electronVersion = process.versions.electron;

    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'About',
        message: `CPPS Launcher v${appVersion}`,
        detail: `Created by Dragon9135.\n\nElectron: ${electronVersion}\nFlash Player: 34.0.0.330 (x86/x64)\nNode.js (Build): 18.20.8\n\nThis is an open-source project developed for hobby purposes.`,
        buttons: ['OK']
    });
}

async function clearBrowsingAndFlashData() {
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

    if (confirmation.response === 1) {
        console.log("User cancelled data clearing.");
        return;
    }

    let flashDataCleared = false;
    let browsingDataCleared = false;
    let flashError = null;
    let browsingError = null;

    const userDataPath = app.getPath('userData');
    const flashDataPath = path.join(userDataPath, 'Pepper Data');
    console.log(`Attempting to clear Flash data in: ${flashDataPath}`);

    try {
        await fsPromises.stat(flashDataPath);

        await fsPromises.rmdir(flashDataPath, {
            recursive: true,
            maxRetries: 3
        });
        console.log("Flash (Pepper Data) folder cleared successfully.");
        flashDataCleared = true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log("Flash (Pepper Data) folder not found, skipping deletion.");
            flashDataCleared = true;
        } else {
            console.error("Error clearing Flash (Pepper Data) folder:", err);
            flashError = err;
        }
    }

    if (view && view.webContents && !view.webContents.isDestroyed()) {
        console.log("Attempting to clear Electron browsing data...");
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

            console.log("Electron browsing data cleared successfully.");
            browsingDataCleared = true;
        } catch (err) {
            console.error("Error clearing Electron browsing data:", err);
            browsingError = err;
        }
    } else {
        console.log("BrowserView not available, skipping Electron browsing data clearing.");

        if (flashDataCleared) browsingDataCleared = true;
    }

    let finalTitle;
    let finalMessage;
    let finalDetail;
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

    if (mainWindow && !mainWindow.isDestroyed()) {
        dialog.showMessageBox(mainWindow, {
            type: finalType,
            title: finalTitle,
            message: finalMessage,
            detail: finalDetail,
            buttons: ['OK']
        }).then(() => {

            if (view && !view.webContents.isDestroyed()) {
                console.log("Reloading the page after clearing data attempt.");
                view.webContents.reloadIgnoringCache();
            }
        });
    } else {
        console.log("Main window closed before clearing could finish reporting.");
    }
}

async function toggleFlashFit() {
    if (!view || !view.webContents || view.webContents.isDestroyed()) {
        console.log("Cannot toggle Flash fit: BrowserView not available.");
        return;
    }

    isFlashFitted = !isFlashFitted;

    const script = `
      (function() {
        const flashElement = document.querySelector('embed[type="application/x-shockwave-flash"], object[type="application/x-shockwave-flash"], object[classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"]');
        if (!flashElement) { console.warn('Fit Flash: Flash element not found.'); return 'not_found'; }

        const shouldFit = ${isFlashFitted};

        let container = flashElement.parentElement;
        for(let i=0; i<3 && container && container.tagName !== 'BODY'; i++) { 
          if (container.id || container.classList.length > 0) break; 
          container = container.parentElement; 
        }

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

    const HIDE_SCROLLBAR_CSS = 'html, body { overflow: hidden !important; }';

    try {

        if (isFlashFitted) {
            flashFitCSSKey = await view.webContents.insertCSS(HIDE_SCROLLBAR_CSS);
        } else if (flashFitCSSKey) {
            if (view && !view.webContents.isDestroyed()) {
                await view.webContents.removeInsertedCSS(flashFitCSSKey);
            }
            flashFitCSSKey = null;
        }

        const result = await view.webContents.executeJavaScript(script, true);
        console.log(`Flash fit script execution result: ${result}`);

        if (result === 'not_found' && isFlashFitted) {
            isFlashFitted = false;
            if (flashFitCSSKey) {
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

        isFlashFitted = !isFlashFitted;
        if (!isFlashFitted && flashFitCSSKey) {
            try {
                if (view && !view.webContents.isDestroyed()) {
                    await view.webContents.removeInsertedCSS(flashFitCSSKey);
                }
            } catch (removeErr) {}
            flashFitCSSKey = null;
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
            dialog.showErrorBox('Fit Flash Error', `An error occurred: ${err.message}`);
        }
    }
}

const menuTemplate = [{
    label: 'Servers',
    submenu: [{
        label: 'New Club Penguin',
        click: () => {
            if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.newcp.net/');
        }
    }, {
        type: 'separator'
    }, {
        label: 'CPPS.to',
        click: () => {
            if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://media.cpps.to/play/');
        }
    }, {
        type: 'separator'
    }, {
        label: 'Antique Penguin',
        click: () => {
            if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.antiquepengu.in/');
        }
    }, {
        type: 'separator'
    }, {
        label: 'Club Penguin Zero',
        click: () => {
            if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.cpzero.net/');
        }
    }, {
        type: 'separator'
    }, {
        label: 'Original Penguin',
        click: () => {
            if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://old.ogpenguin.online/');
        }
    }, {
        type: 'separator'
    }, {
        label: 'Club Penguin Dimensions',
        click: () => {
            if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://play.cpdimensions.com/pt/#/login');
        }
    }]
}, {
    label: 'Options',
    submenu: [{
        label: 'Reload',
        click: () => {
            if (view && !view.webContents.isDestroyed()) view.webContents.reload();
        },
        accelerator: 'F5'
    }, {
        type: 'separator'
    }, {
        label: 'Toggle Fullscreen Window',
        accelerator: 'F11',
        click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
        }
    }, {
        type: 'separator'
    }, {
        label: 'Toggle Fit Flash to Window',
        click: toggleFlashFit
    }, {
        type: 'separator'
    }, {
        label: 'Flash Player General Settings',
        click: () => {
            if (view && !view.webContents.isDestroyed()) view.webContents.loadURL('https://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager02.html');
        }
    }, {
        type: 'separator'
    }, {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+=',
        click: () => {
            if (view && !view.webContents.isDestroyed()) {
                const currentZoom = view.webContents.getZoomFactor();
                const newZoom = Math.min(3.0, currentZoom + 0.1);
                view.webContents.setZoomFactor(newZoom);
                console.log(`Zoom Factor set to: ${newZoom.toFixed(1)}`);
            }
        }
    }, {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: () => {
            if (view && !view.webContents.isDestroyed()) {
                const currentZoom = view.webContents.getZoomFactor();
                const newZoom = Math.max(0.5, currentZoom - 0.1);
                view.webContents.setZoomFactor(newZoom);
                console.log(`Zoom Factor set to: ${newZoom.toFixed(1)}`);
            }
        }
    }, {
        label: 'Reset Zoom',
        accelerator: 'CmdOrCtrl+0',
        click: () => {
            if (view && !view.webContents.isDestroyed()) {
                view.webContents.setZoomFactor(1.0);
                console.log(`Zoom Factor reset to: 1.0`);
            }
        }
    }, {
        type: 'separator'
    }, {
        label: 'Clear Data',
        click: clearBrowsingAndFlashData
    }, {
        type: 'separator'
    }, {
        label: 'Check for Updates',
        click: () => {

            shell.openExternal('https://github.com/Dragon9135/CPPS-Launcher/releases/latest');
        }
    }]
}, {
    label: 'About',
    click: showAboutDialog
}];

if (isDev) {
    const optionsSubmenu = menuTemplate.find(item => item.label === 'Options') ? .submenu;
    if (optionsSubmenu) {
        optionsSubmenu.push({
            type: 'separator'
        }, {
            label: 'Toggle Developer Tools',
            click: () => {
                if (view && !view.webContents.isDestroyed()) view.webContents.toggleDevTools();
            },
            accelerator: 'Ctrl+Shift+I'
        });
    }
}

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

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    view = new BrowserView({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            plugins: true,
            sandbox: false,
            devTools: isDev
        }
    });
    mainWindow.setBrowserView(view);

    view.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'flash') {
            return callback(true);
        }
        callback(false);
    });

    view.setAutoResize({
        width: true,
        height: true
    });
    resizeView();
    mainWindow.on('resize', resizeView);

    setupSessionInterceptors(view.webContents.session);

    async function applySiteSpecificPatches(url) {
        try {
            if (!view || view.webContents.isDestroyed()) return;

            if (url.includes('newcp.net')) {
                await view.webContents.insertCSS(NEWCP_COSMETIC_CSS);
                console.log(`Cosmetic filter applied to newcp.net (URL: ${url})`);

                let playButtonText = 'Play Now!';
                if (url.includes('/pt-BR/')) {
                    playButtonText = 'Jogar!';
                } else if (url.includes('/es-LA/')) {
                    playButtonText = '¡Jugar!';
                }

                const replaceButtonScript = `
                  (function() {
                    try {
                      const downloadLink = document.querySelector('a.nav-link[href="/download"]');
                      if (downloadLink) {
                        const newText = '${playButtonText}'; 
                        const newPlayButtonHTML = \`
                          <a href="/plays?force=true#/login" data-rr-ui-event-key="/plays?force=true#/login" class="nav-link">
                            <button type="submit" id="Navbar_download-btn__6D0hQ" class="btn btn-danger">
                              <div id="Navbar_download-text__FSfPd" style="border: none; position: unset;">\${newText}</div>
                            </button>
                          </a>\`;
                        downloadLink.outerHTML = newPlayButtonHTML;
                        console.log('CPPS Launcher: Replaced "Download" button with "' + newText + '" button.');
                      } else {

                      }
                    } catch (e) {
                      console.error('CPPS Launcher: Error replacing button:', e);
                    }
                  })();
                `;
                await view.webContents.executeJavaScript(replaceButtonScript);
            }

            if (isFlashFitted) {
                console.log("Resetting Fit Flash state due to navigation.");
                if (flashFitCSSKey) {
                    try {
                        if (view && !view.webContents.isDestroyed()) {
                            await view.webContents.removeInsertedCSS(flashFitCSSKey);
                        }
                    } catch (e) {
                        console.warn("Could not remove flash fit CSS:", e.message);
                    }
                    flashFitCSSKey = null;
                }
                isFlashFitted = false;
            }
        } catch (err) {
            console.error('Error during applySiteSpecificPatches:', err);
        }
    }

    view.webContents.on('crashed', (event, killed) => {
        console.error(`BrowserView crashed! Killed: ${killed}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            dialog.showErrorBox("Error", "The game view process has crashed. Please try reloading (Options > Reload) or restarting the application.");
        }
    });

    view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {

        if (errorCode === -3) {

            if (BLOCK_LIST.some(domain => (validatedURL || '').toLowerCase().includes(domain))) {
                console.log(`Ad/tracker request blocked (ERR_ABORTED): ${validatedURL}`);
            } else {

                console.warn(`Load aborted (may be intentional): ${validatedURL} (${errorCode})`);
            }
            return;
        }

        if (!isMainFrame) {
            console.warn(`Subframe failed to load: ${validatedURL} (Error: ${errorDescription} / ${errorCode})`);
            return;
        }

        console.error(`BrowserView failed to load URL: ${validatedURL} Error: ${errorDescription} (${errorCode})`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            dialog.showErrorBox("Load Error", `Failed to load the page: ${validatedURL}\nError: ${errorDescription} (${errorCode})\n\nPlease check your internet connection or try reloading.`);
        }
    });

    view.webContents.on('did-finish-load', async () => {
        if (!view || view.webContents.isDestroyed()) return;
        await applySiteSpecificPatches(view.webContents.getURL());
    });

    view.webContents.on('did-navigate-in-page', async (event, url, isMainFrame) => {

        if (isMainFrame && view && !view.webContents.isDestroyed()) {
            await applySiteSpecificPatches(url);
        }
    });

    view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');

    const initialUrl = 'https://newcp.net/en-US/';
    try {
        console.log(`Loading initial URL: ${initialUrl}`);
        view.webContents.loadURL(initialUrl);
    } catch (err) {
        console.error("Error loading initial URL:", err);
        if (mainWindow && !mainWindow.isDestroyed()) {
            dialog.showErrorBox("Initial Load Error", `Failed to load the starting page: ${initialUrl}\nError: ${err.message}`);
        }
    }

    initDiscordRPC();
}

try {
    systemPreferences.themeSource = 'system';
} catch (err) {
    console.warn("Failed to set system theme source:", err.message);
}

app.on('window-all-closed', () => {

    if (rpcReady && rpc) {
        try {
            rpc.destroy().catch(err => console.error("Error destroying RPC on quit:", err));
            console.log("Discord RPC connection closed.");
            rpcReady = false;
        } catch (err) {
            console.error("Error destroying Discord RPC:", err);
        }
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {

    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.whenReady().then(() => {

    if (!existsSync(pluginPath)) {
        console.error(`Flash plugin not found at expected path: ${pluginPath}`);
        dialog.showErrorBox("Flash Plugin Error", `Flash plugin (pepflashplayer.dll) not found.\n\nArchitecture: ${arch}\nExpected location:\n${pluginPath}\n\nPlease ensure the plugin is placed correctly in the 'plugins/${arch}' folder next to the application executable.`);

        app.quit();
        return;
    } else {
        console.log(`Using Flash plugin found at: ${pluginPath}`);
    }

    createWindow();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (!isDev && mainWindow && !mainWindow.isDestroyed()) {
        dialog.showErrorBox('Unhandled Error', `An unexpected error occurred (Promise Rejection).\nPlease report this issue.\nDetails: ${reason}`);
    }
});

process.on('uncaughtException', (error, origin) => {
    console.error(`Caught exception: ${error}\nException origin: ${origin}`);
    if (app.isReady() && mainWindow && !mainWindow.isDestroyed()) {
        dialog.showErrorBox('Unhandled Error', `A critical error occurred: ${error.message}\nOrigin: ${origin}\n\nPlease report this issue.\n${error.stack}`);
    }
});
