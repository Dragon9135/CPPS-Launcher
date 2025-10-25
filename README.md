# CPPS Launcher

A lightweight, optimized desktop launcher for various Club Penguin Private Servers (CPPS) that still require the Adobe Flash Player plugin. Built with an older version of Electron to maintain Pepper Flash compatibility.

<center><img width="1920" height="1030" alt="Ekran Alıntısı" src="https://github.com/user-attachments/assets/57314765-5bd2-4d20-a50b-8462196d2f80" /></center>

## Features

* **Multi-Server Support:** Easily switch between popular CPPS via a simple dropdown menu. Currently configured for:
    * New Club Penguin
    * CPPS.to
    * CP Dimensions
    * CP Zero

* **Lightweight & Optimized:** Built to consume minimal system resources (CPU/RAM). Includes various performance flags passed to the underlying Chromium engine.
* **Flash Compatibility:** Uses Electron 5.x, one of the last versions to support the Pepper Flash (PPAPI) plugin.
* **Black Screen Fix:** Implements `webRequest` listeners to modify `X-Frame-Options` and `Content-Security-Policy` headers, allowing sites that normally block embedding to load within the launcher.
* **Sharp Flash Rendering:** Forces a device scale factor of 1.0, preventing the blurriness often caused by Windows/macOS display scaling settings on Flash content.
* **Simple Interface:** Clean UI with dropdown menus for server selection and basic options (Reload).
* **(Note:** Network-level ad blocking was initially implemented but removed due to causing infinite refresh loops on target CPPS sites. Specific cosmetic filtering for NewCP is included).

## Why This Project?

With Adobe Flash Player reaching its end-of-life and being removed from modern browsers, accessing older CPPS that haven't migrated away from Flash became difficult. This launcher provides a self-contained environment using an older, compatible Electron version and the necessary Pepper Flash plugin to keep playing these servers.

## Technology Stack

* **Electron:** 5.0.13 (Crucial for Flash support)
* **Node.js:** **16.x** (Required for compatibility with Electron 5. Newer Node versions **will not work**.)
* **Pepper Flash Plugin:** Requires manual addition of `pepflashplayer.dll` (Windows), `PepperFlashPlayer.plugin` (macOS), or `libpepflashplayer.so` (Linux).
* **HTML / CSS / JavaScript:** For the launcher interface and logic.
* **Electron Forge:** Used for packaging the application.

## Usage (For End Users)

1.  Download the latest release (`Setup.exe` for Windows) from the [GitHub Releases](https://github.com/Dragon9135/CPPS-Launcher/releases) page.

2.  Run the installer.

3.  Launch the application from your Start Menu or Desktop shortcut.

4.  Select a server from the "Servers" menu.

## Development Setup

To build or modify the launcher yourself:

### Prerequisites

* **Node.js v16.x:** Download and install a Node.js version from the 16.x series (e.g., 16.20.2). **Newer versions are incompatible.** ([Node.js Previous Releases](https://nodejs.org/en/download/releases)). Make sure `node` and `npm` are in your system's PATH.
* **Pepper Flash Plugin:** Obtain the correct Pepper Flash plugin file for your OS (e.g., `pepflashplayer.dll`).
* **Git:** For cloning the repository.

### Building

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Dragon9135/CPPS-Launcher.git
    cd cpps-launcher
    ```

2.  **Place the Flash Plugin:** Create a folder named `plugins` inside the `cpps-launcher` directory. Copy your `pepflashplayer.dll` (or equivalent) file into this `plugins` folder.

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Run for testing:**
    ```bash
    npm start
    ```

5.  **Build the executable/installer:**
    ```bash
    npm run make
    ```
    The output files (installer, zip) will be in the `out` folder.

## ⚠️ Important Notes & Security Warning

* **Outdated Technology:** This launcher uses **Electron 5**, which is **very old (from 2019)** and **no longer receives security updates**. The underlying Chromium version also has known vulnerabilities.
* **Security Risk:** **DO NOT** use this launcher for browsing general websites, logging into sensitive accounts, or anything other than connecting to the intended CPPS URLs. Treat it as a single-purpose tool.
* **Pepper Flash:** Adobe Flash Player itself is end-of-life and also has security risks.
* **Stability:** Due to the age of the components, occasional instability or crashes might occur.

**Use this software at your own risk.**

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.
