# CPPS Launcher

A lightweight, highly optimized desktop launcher for Club Penguin Private Servers (CPPS) that require the Adobe Flash Player plugin. This application is built with a legacy version of Electron (`11.5.0`) to ensure Pepper Flash (PPAPI) compatibility while integrating modern ad-blocking, Cloudflare bypass techniques, and automated builds.

> [!NOTE]
> AI assistance was used for optimization, bug fixes, and advanced feature integration.

## ✨ Features

### Multi-Server Support
Easily switch between popular CPPS servers via the `Servers` menu:

* Club Penguin Zero
* Club Penguin Dimensions
* Aventure Pingouin
* Antique Penguin
* Original Penguin
* Club Penguin Atake
* Fluffy Penguin
* CPPS.app
* CPPS.to
* Waddle World

### Advanced Ad & Tracker Blocking
* **Dynamic HaGeZi Ultimate Blocklist:** Automatically downloads and caches the [HaGeZi Ultimate](https://github.com/hagezi/dns-blocklists) blocklist (~300,000+ domains) with a 24-hour update cycle.
* **O(1) Lookup Performance:** Uses `Set` data structure with intelligent subdomain matching for lightning-fast request filtering.
* **Manual Fallback List:** Ships with a curated list of critical ad/tracker domains to ensure protection even without internet connectivity on first launch.
* **Whitelist System:** Automatically protects CPPS servers, Cloudflare challenges, and Discord domains from false-positive blocks.

### Cloudflare Bypass Integration
Custom anti-bot mitigations to help pass Cloudflare Turnstile and managed challenges:
* `disable-blink-features: AutomationControlled` flag
* `navigator.webdriver` spoofing via JS injection
* Expanded permission handler (clipboard, media, notifications)
* Modern User-Agent string (Chrome 124)
* Headless browser fingerprint masking

### UI/UX Enhancements
* **Global Scrollbar Hiding:** Automatically injects CSS to hide scrollbars on all loaded CPPS sites for a cleaner game view while preserving scroll functionality.
* **Custom Themed Home Screen:** Symmetrical, Flexbox-centered landing page featuring Gary from Club Penguin.
* **Fit Flash to Window:** Toggle option to stretch the Flash game to fill the entire window.

### Native App Controls
* **Toggle Fullscreen:** Switch to a native fullscreen window using `F11`.
* **Zoom Controls:** Zoom in (`Ctrl`+`=`), out (`Ctrl`+`-`), or reset (`Ctrl`+`0`).
* **Clear Browsing & Flash Data:** One-click clearing of cache, cookies, localStorage, and Flash LSOs to resolve login/loading issues.
* **Check for Updates:** Quick link to the GitHub Releases page.

### Discord Rich Presence
Automatically displays your "Playing Club Penguin" status on Discord (requires a valid Discord Application ID configured in `main.js`).

### Stability & Reliability
* **Flash Plugin Verification:** Validates the presence of `pepflashplayer.dll` on startup with detailed error reporting.
* **Node 12 Compatible:** Custom recursive directory deletion function compatible with Electron 11's bundled Node.js.
* **Race Condition Protection:** Lock mechanisms prevent duplicate data-clearing operations.
* **Cooldown System:** Prevents rapid-fire Flash fit state resets.
* **Black Screen Fix:** Dynamically modifies `X-Frame-Options` and `Content-Security-Policy` headers to allow embedding-restricted CPPS sites to load.

### Automated CI/CD
GitHub Actions workflow automatically builds Windows installers (NSIS) and portable executables on every tagged release.

## Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| **Electron** | `11.5.0` | Last version supporting Pepper Flash (PPAPI) |
| **Node.js** | `18.x` (Build) | Required for electron-builder compatibility |
| **Node.js** | `12.13.0` (Runtime) | Bundled with Electron 11 |
| **Clean Flash Player** | `34.0.0.376` | Kill-switch removed community build |
| **electron-builder** | `^22.14.13` | Packaging (v24+ incompatible with Electron 11) |
| **discord-rpc** | `4.0.1` | Discord Rich Presence |

## Usage (For End Users)

1. Download the latest installer (`CPPS Launcher Setup X.X.X.exe`) or portable (`CPPS Launcher X.X.X.exe`) from the [GitHub Releases](https://github.com/Dragon9135/CPPS-Launcher/releases) page.
2. If using the installer, run it and follow the setup wizard.
3. Launch the application.
4. Select a server from the **Servers** menu to begin playing.

> [!TIP]
> If a site gets stuck on a Cloudflare challenge, try reloading (`F5`) or use the **Options → Check for Updates** menu to ensure you have the latest version.

## Development Setup

### Prerequisites

* **Node.js v18.x:** You **must** install a version from the 18.x series (e.g., `18.20.8`). Newer versions will conflict with `electron-builder@22`. [Node.js Previous Releases](https://nodejs.org/en/download/releases)
* **Git:** For cloning the repository.
* **Clean Flash Player PPAPI:** Obtain both x86 and x64 builds of Clean Flash `34.0.0.376` (recommended over Adobe's discontinued plugin due to kill-switch removal).

### Building Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dragon9135/CPPS-Launcher.git
   cd CPPS-Launcher
   ```

2. **Add the Flash Plugin:**
   Create the following directory structure and place the DLLs accordingly:
   ```
   CPPS-Launcher/
   ├── plugins/
   │   ├── x86/
   │   │   └── pepflashplayer.dll  (32-bit Clean Flash)
   │   └── x64/
   │       └── pepflashplayer.dll  (64-bit Clean Flash)
   ├── icon.ico
   ├── main.js
   ├── index.html
   ├── preload.js
   └── package.json
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run in development mode:**
   ```bash
   npm start
   ```

5. **Build the executables:**
   ```bash
   npm run build
   ```
   Output files will be generated in the `dist/` folder.

### GitHub Actions (Automated Builds)

The project includes a `.github/workflows/build.yml` workflow that:
* Triggers on version tags (`v*`) or manual dispatch
* Verifies the presence of Flash plugins in `plugins/x86/` and `plugins/x64/`
* Builds NSIS installer + portable `.exe` using `electron-builder`
* Uploads artifacts to GitHub Releases automatically via `GH_TOKEN`

> [!IMPORTANT]
> The Flash `.dll` files must be committed to the repository (or added via Git LFS) for the CI build to succeed, as they are not publicly downloadable during the workflow.

## Project Rationale

With Adobe Flash Player's end-of-life on December 31, 2020, accessing legacy Club Penguin Private Servers became increasingly difficult. This launcher provides a self-contained, sandboxed environment to continue enjoying these servers while implementing modern privacy protections (ad-blocking, tracker prevention) and compatibility improvements (Cloudflare bypass, scrollbar normalization).

## Critical Security Warning

> [!CAUTION]
> This application uses **outdated technology** (Electron 11.5.0 based on Chromium 87, and Flash Player via the community-maintained Clean Flash builds) that **no longer receives official security updates from Adobe**.
>
> * The underlying Chromium version has known, unpatched vulnerabilities.
> * **DO NOT** use this launcher for general web browsing.
> * **DO NOT** enter sensitive information (passwords, credit cards, etc.) on any site other than trusted CPPS login pages.
> * **DO NOT** visit untrusted or malicious URLs within the launcher.

**Use this software at your own risk. It is intended solely for playing Club Penguin Private Servers.**

## Contributing

Contributions are welcome! When submitting PRs:
* Ensure all syntax is valid (no malformed arrow functions or logical operators).
* Keep the `WHITELIST` updated if adding new CPPS servers.
* Test Cloudflare bypass behavior on major CPPS sites.
* Maintain the Node 12 compatibility for runtime code.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Acknowledgments

* [HaGeZi](https://github.com/hagezi/dns-blocklists) for the excellent DNS blocklists.
* [Clean Flash Player](https://github.com/darktohka/clean-flash-builds) community for maintaining Flash builds.
* The Club Penguin Private Server community for keeping the game alive.
