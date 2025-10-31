# CPPS Launcher

A lightweight, optimized desktop launcher for Club Penguin Private Servers (CPPS) that require the Adobe Flash Player plugin. This application is built with a legacy version of Electron (`11.5.0`) to ensure Pepper Flash compatibility.

**Note:** AI assistance was used for some functions and bug fixes.

## Features

  * **Multi-Server Support:** Easily switch between popular servers via the `Servers` menu:

      * New Club Penguin
      * CPPS.to
      * Antique Penguin
      * Club Penguin Zero
      * Original Penguin
      * Club Penguin Dimensions

  * **Flash Plugin Verification:** Automatically checks on startup if the required `pepflashplayer.dll` files are present. If not, it provides a detailed error message explaining the exact paths needed.
  * **Clear Browsing & Flash Data:** A simple menu option (`Options` \> `Clear Data`) to clear all cache, cookies, and Flash Player data (LSOs), which can resolve common login or loading issues.
  * **Discord Rich Presence:** Automatically shows your "Playing Club Penguin" status on Discord (only in the packaged application).

  * **Native App Controls:**
      * **Toggle Fullscreen:** Switch to a native fullscreen window using `F11`.
      * **Zoom Controls:** Zoom in (`Ctrl`+`=`), out (`Ctrl`+`-`), or reset (`Ctrl`+`0`) to adjust the game's size.
      * **Fit Flash:** An option to attempt stretching the Flash game to fill the entire window.

  * **Check for Updates:** A menu item (`Options` \> `Check for Updates`) that opens the project's GitHub Releases page.
  * **Lightweight & Optimized:** Built to consume minimal system resources (CPU/RAM) using optimized Chromium flags.
  * **Ad & Tracker Blocking:** Includes a basic blocklist for common ad and tracking domains.
  * **Black Screen Fix:** Modifies headers (`X-Frame-Options`, `Content-Security-Policy`) on the fly to allow CPPS sites that normally block embedding to load correctly.

## Technology Stack

  * **Electron:** `11.5.0` (Crucial for Flash support).
  * **Node.js:** `18.x` (Required for `electron-builder` and compatibility with Electron 11).
  * **Pepper Flash Plugin:** Requires manual addition of `pepflashplayer.dll` (**Windows only**).
  * **Electron Builder:** Used for packaging the application into an installer and portable `.exe`.

## Usage (For End Users)

1.  Download the latest installer (`CPPS-Launcher-Setup-X.X.X.exe`) or portable (`CPPS-Launcher-Portable-X.X.X.exe`) from the [GitHub Releases](https://github.com/Dragon9135/CPPS-Launcher/releases) page.
2.  If using the installer, run it.
3.  Launch the application.
4.  Select a server from the "Servers" menu to begin.

## Development Setup

To build or modify the launcher:

### Prerequisites

  * **Node.js v18.x:** You **must** install a version from the 18.x series (e.g., `18.20.8`). Newer Node versions will not work. [Node.js Previous Releases](https://nodejs.org/en/download/releases).
  * **Git:** For cloning the repository.
  * **Pepper Flash Plugin:** You must obtain both the 32-bit (`x86`) and 64-bit (`x64`) versions of `pepflashplayer.dll`.

### Building

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Dragon9135/CPPS-Launcher.git
    cd CPPS-Launcher
    ```

2.  **Add the Flash Plugin:**
    This is the most critical step. The app is hard-coded to look for plugins based on the computer's architecture.

      * Create a folder named `plugins` in the project's root directory.
      * Inside `plugins`, create two more folders: `x86` and `x64`.
      * Place the **32-bit** `pepflashplayer.dll` inside the `plugins/x86/` folder.
      * Place the **64-bit** `pepflashplayer.dll` inside the `plugins/x64/` folder.

    **The final structure should be:**
    ```
    CPPS-Launcher/
    ├── plugins/
    │   ├── x86/
    │   │   └── pepflashplayer.dll  (32-bit version)
    │   └── x64/
    │       └── pepflashplayer.dll  (64-bit version)
    ├── icon.ico
    ├── main.js
    ├── index.html
    ├── preload.js
    └── package.json
    ```

3.  **Install dependencies:**

    ```bash
    npm install
    ```

4.  **Run in development mode:**

    ```bash
    npm start
    ```

5.  **Build the executables:**

    ```bash
    npm run build
    ```

    The output files (installer and portable) will be in the `dist` folder.

## Project Rationale

With Adobe Flash Player's end-of-life, accessing older CPPS that have not migrated to new technologies became difficult. This launcher provides a self-contained, legacy environment to continue playing these servers.

## ⚠️ Critical Security Warning

This application uses **outdated technology** (Electron 11.5.0 and Adobe Flash Player) that **no longer receives security updates**.

  * The underlying Chromium version has known, unpatched vulnerabilities.
  * **DO NOT** use this launcher for browsing any website other than the intended CPPS URLs.
  * **DO NOT** enter sensitive information (passwords, credit cards, etc.) on any site other than the official CPPS login pages.

**Use this software at your own risk.**

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
