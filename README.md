# CPPS Launcher

A lightweight, optimized desktop launcher for Club Penguin Private Servers (CPPS) that require the Adobe Flash Player plugin. This application is built with a legacy version of Electron to ensure Pepper Flash compatibility.

## Features

  * **Multi-Server Support:** Easily switch between popular servers, including:
      * New Club Penguin
      * CPPS.to
      * CP Dimensions
      * CP Zero
  * **Lightweight & Optimized:** Built to consume minimal system resources (CPU/RAM) using optimized Chromium flags.
  * **Flash Compatibility:** Uses Electron 5.x, one of the last versions to support the Pepper Flash (PPAPI) plugin.
  * **Black Screen Fix:** Modifies headers (`X-Frame-Options`, `Content-Security-Policy`) to allow sites that normally block embedding to load correctly.
  * **Sharp Flash Rendering:** Forces a 1.0 device scale factor to prevent blurriness on systems with display scaling.
  * **Simple Interface:** A clean UI with dropdown menus for server selection and basic controls.

## Technology Stack

  * **Electron:** `11.5.0` (Crucial for Flash support)
  * **Node.js:** `18.x` (Required for compatibility with Electron 11. Newer Node versions **will not work**.)
  * **Pepper Flash Plugin:** Requires manual addition of `pepflashplayer.dll` (Windows), `PepperFlashPlayer.plugin` (macOS), or `libpepflashplayer.so` (Linux).
  * **Electron Forge:** Used for packaging the application.

## Usage (For End Users)

1.  Download the latest installer (`Setup.exe` for Windows) from the [GitHub Releases](https://github.com/Dragon9135/CPPS-Launcher/releases) page.
2.  Run the installer.
3.  Launch the application from your Start Menu or Desktop.
4.  Select a server from the "Servers" menu.

## Development Setup

To build or modify the launcher:

### Prerequisites

  * **Node.js v18.x:** You must install a version from the 16.x series (e.g., `18.20.8`). [Node.js Previous Releases](https://nodejs.org/en/download/releases).
  * **Git:** For cloning the repository.
  * **Pepper Flash Plugin:** You must obtain the `pepflashplayer` file for your OS.

### Building

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Dragon9135/CPPS-Launcher.git
    cd cpps-launcher
    ```

2.  **Add the Flash Plugin:**

      * Create a folder named `plugins` in the project's root directory.
      * Copy your `pepflashplayer.dll` (or `.plugin` / `.so`) file into this `plugins` folder.

3.  **Install dependencies:**

    ```bash
    npm install
    ```

4.  **Run in development mode:**

    ```bash
    npm start
    ```

5.  **Build the installer:**

    ```bash
    npm run make
    ```

    The output files will be in the `out` folder.

## Project Rationale

With Adobe Flash Player's end-of-life, accessing older CPPS that have not migrated to new technologies became difficult. This launcher provides a self-contained, legacy environment to continue playing these servers.

## ⚠️ Critical Security Warning

This application uses **outdated technology** (Electron 5 and Adobe Flash Player) that **no longer receives security updates**.

  * The underlying Chromium version has known vulnerabilities.
  * **DO NOT** use this launcher for browsing any website other than the intended CPPS URLs.
  * **DO NOT** enter sensitive information (passwords, etc.) on any site other than the official CPPS login pages.

**Use this software at your own risk.**

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
