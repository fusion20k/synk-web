---
timestamp: 2025-08-26T04:25:54.130974
initial_query: Continue. You were in the middle of request:
Fix list for Zencoder — do only these 5 items in c:\Users\david\Desktop\synk\synk-fixed\
0) Prelim — environment & guard rails
Use MODE / DEMO_MODE from .env to decide dev vs prod behavior.
DEMO_MODE=true → localhost flows / smaller test popups.
DEMO_MODE=false → production flows / system browser (required for Google verification).
At startup, fail fast if required env keys missing and log clearly:
NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_REDIRECT_URI, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.
1) Auto-sync behavior — immediate + 5-minute fallback
Goal: automatic sync on any new change; periodic poll every 5 minutes as fallback.
Implementation (add src/syncManager.js or equivalent):
```
// pseudo-implementation — drop into app and wire startSyncManager() at startup
class SyncManager {
  constructor() {
    this.queue = new Set(); // list of sync jobs (unique by pair)
    this.debounceTimer = null;
    this.syncInProgress = false;
    this.pollIntervalMs = 5 * 60 * 1000; // 5 minutes
    this.backoffMs = 1000;
    this.startPeriodicPoll();
  }

  // called whenever a user creates/edits/deletes an item locally
  onLocalChange(syncKey) {
    this.queue.add(syncKey);
    // small buffer so rapid multi-changes collapse
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flushQueue(), 1200); // 1.2s buffer
  }

  // flush queue and run sync worker
  async flushQueue() {
    if (this.syncInProgress || this.queue.size === 0) return;
    this.syncInProgress = true;
    const jobs = Array.from(this.queue);
    this.queue.clear();
    try {
      for (const job of jobs) {
        await this.performSync(job); // implement actual sync logic
      }
      this.backoffMs = 1000; // reset backoff on success
    } catch (err) {
      console.error('Sync failed', err);
      // push failed jobs back in queue
      jobs.forEach(j => this.queue.add(j));
      // exponential backoff before next attempt
      await sleep(this.backoffMs);
      this.backoffMs = Math.min(this.backoffMs * 2, 60_000);
    } finally {
      this.syncInProgress = false;
    }
  }

  async performSync(job) {
    // job contains what-to-sync (googleCalendarId, notionPageId, direction, etc.)
    // implement existing API calls here; ensure tokens are current (refresh if needed)
  }

  startPeriodicPoll() {
    this.pollTimer = setInterval(() => {
      // enqueue a full sync job that checks for remote changes
      this.queue.add('full-poll'); // implement logic for 'full-poll'
      this.flushQueue();
    }, this.pollIntervalMs);
  }

  stop() {
    clearInterval(this.pollTimer);
    clearTimeout(this.debounceTimer);
  }
}

module.exports = new SyncManager();

```
Notes / acceptance:
No user setting for auto-sync — it always runs.
Immediate on-change (debounced ~1–2s).
Periodic poll every 5 min.
Retry/backoff on error.
Persist lastSyncAt per account in local storage for diagnostics.
2) Custom border & native window controls (close/max/min) — implement frameless window + custom titlebar
Goal: app window has dark grey border and white control buttons (close/max/min). No native menu bar visible.
Main process (electron-main.js) changes:
```
const { app, BrowserWindow, Menu } = require('electron');
Menu.setApplicationMenu(null); // remove File/Edit/View default menu

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,                // remove native frame
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  // do NOT call win.webContents.openDevTools() in production
  win.loadFile('src/index.html');
}

```
Preload (src/preload.js):
```
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized')
});

```
Main process IPC handlers:
```
ipcMain.handle('window-minimize', () => win.minimize());
ipcMain.handle('window-maximize', () => {
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.handle('window-close', () => win.close());
ipcMain.handle('window-is-maximized', () => win.isMaximized());

```
Renderer (custom titlebar HTML + CSS):
Create a fixed top bar with dark-grey border #1f1f24, add three white circular buttons for close/max/min.
Hook them to window.electronAPI.close() etc.
Ensure body content has padding-top to avoid overlap.
Important: only update UI styles, do not change app logic.
3) Remove dev/HTML properties console and default menu (File/Edit/View/Window/Help)
Goal: No menu bar, no devtools or inspector auto-opening.
Main notes (electron-main.js):
Menu.setApplicationMenu(null);
win.setMenuBarVisibility(false);
Ensure there are no calls to win.webContents.openDevTools() anywhere in production code (wrap any devtools calls behind if (process.env.MODE !== 'production')).
Ensure app.commandLine.appendSwitch('disable-features', 'AllowNativeNotifications') is NOT needed; main point is don't open DevTools.
Check: remove any webPreferences flags that cause inspector to auto-open.
4) About page content
Goal: About tab/page contains clickable site link + support email + version.
Renderer snippet (About page):
```
<div class="about-card">
  <h2>About Synk</h2>
  <p>Synk syncs Notion and Google Calendar events.</p>
  <p>Website: <a id="homepage-link" href="#">https://synk-official.com</a></p>
  <p>Support: <a id="support-mail" href="mailto:support@synk-official.com">support@synk-official.com</a></p>
  <p>Version: <span id="app-version"></span></p>
</div>

```
Renderer JS:
```
document.getElementById('homepage-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.open('https://synk-official.com'); // in app use electronAPI.openExternal if provided
});
document.getElementById('app-version').textContent = APP_VERSION; // read from injected build meta

```
If using Electron openExternal:
Expose openExternal via preload to call shell.openExternal(url).
5) Fix redirect_uri_mismatch (Google) & general OAuth popup sizing/flow
Primary cause: the redirect_uri parameter passed to Google does not exactly match the value registered in Google Cloud Console.
Rules to implement:
Always build the auth URL using process.env.GOOGLE_REDIRECT_URI (and NOT a hardcoded or computed value).
Ensure GOOGLE_REDIRECT_URI value exactly matches the one in Google Console (protocol, subdomain, path, no trailing slash unless registered).
Log the exact redirect_uri and full authUrl prior to opening the popup for debugging.
Build auth URL (sample function — put where you generate Google auth):
```
function buildGoogleAuthUrl({ code_challenge, state }) {
  const redirect = process.env.GOOGLE_REDIRECT_URI;
  if (!redirect) throw new Error('MISSING GOOGLE_REDIRECT_URI env var');
  const scope = encodeURIComponent('openid email profile https://www.googleapis.com/auth/calendar.readonly');
  return [
    'https://accounts.google.com/o/oauth2/v2/auth',
    `?client_id=${process.env.GOOGLE_CLIENT_ID}`,
    `&redirect_uri=${encodeURIComponent(redirect)}`,
    '&response_type=code',
    `&scope=${scope}`,
    '&access_type=offline',
    '&prompt=consent%20select_account',
    `&state=${state}`,
    `&code_challenge=${code_challenge}`,
    '&code_challenge_method=S256'
  ].join('');
}

```
Important:
Before opening popup, print (in logs) two lines:
console.log('Using GOOGLE_REDIRECT_URI=', process.env.GOOGLE_REDIRECT_URI);
console.log('Google Auth URL=', authUrl);
Confirm the printed GOOGLE_REDIRECT_URI is exactly the same string as what you registered in Google Cloud Console (copy-paste match).
Opening popup:
Production (DEMO_MODE=false) — MUST open system browser to comply with Google verification:
```
const { shell } = require('electron');
shell.openExternal(authUrl); // opens user's browser (compliant)

```
The UI should show a small "Waiting for authentication..." modal inside the app while user completes sign-in in browser.
Dev/demo (DEMO_MODE=true) — you may open a smaller BrowserWindow for convenience to test:
```
const authWin = new BrowserWindow({ parent: win, modal: false, width: 520, height: 700, webPreferences: { nodeIntegration: false, contextIsolation: true }});
authWin.loadURL(authUrl);

```
But do NOT use this in production for Google verification — the production path must use shell.openExternal.
Callback / loopback
If redirect points to http://localhost:3000/..., ensure the app starts a local loopback server listening on that port and captures the code.
If redirect points to https://synk-official.com/..., ensure your hosted endpoint receives the code and that the app polls your server or you use the hosted relay to finish token exchange.
Common pitfalls & how to avoid
Trailing slash mismatch: https://synk-official.com/oauth/google/callback vs https://synk-official.com/oauth/google/callback/ — the strings must match exactly.
Using http://127.0.0.1 vs http://localhost — register whichever you will actually use.
Not URL-encoding redirect_uri in the auth URL — use encodeURIComponent.
Not logging the auth URL — always log it temporarily to confirm.
Pull the updated branch / changes in synk-fixed.
Create/update .env and ensure exact redirect URIs are present in providers:
For testing:
```
DEMO_MODE=true
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
NOTION_REDIRECT_URI=http://localhost:3000/oauth/notion/callback

```
For production:
```
DEMO_MODE=false
GOOGLE_REDIRECT_URI=https://synk-official.com/oauth/google/callback
NOTION_REDIRECT_URI=https://synk-official.com/oauth/notion/callback
```
Confirm the Google Cloud Console OAuth client has the exact production redirect URL registered (copy-paste from env). If mismatch persists, paste the printed GOOGLE_REDIRECT_URI from logs into the Authorized Redirect URIs in Google Console and save.
Avoid repeating steps you've already taken.
task_state: working
total_messages: 120
---

# Conversation Summary

## Initial Query
Continue. You were in the middle of request:
Fix list for Zencoder — do only these 5 items in c:\Users\david\Desktop\synk\synk-fixed\
0) Prelim — environment & guard rails
Use MODE / DEMO_MODE from .env to decide dev vs prod behavior.
DEMO_MODE=true → localhost flows / smaller test popups.
DEMO_MODE=false → production flows / system browser (required for Google verification).
At startup, fail fast if required env keys missing and log clearly:
NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_REDIRECT_URI, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.
1) Auto-sync behavior — immediate + 5-minute fallback
Goal: automatic sync on any new change; periodic poll every 5 minutes as fallback.
Implementation (add src/syncManager.js or equivalent):
```
// pseudo-implementation — drop into app and wire startSyncManager() at startup
class SyncManager {
  constructor() {
    this.queue = new Set(); // list of sync jobs (unique by pair)
    this.debounceTimer = null;
    this.syncInProgress = false;
    this.pollIntervalMs = 5 * 60 * 1000; // 5 minutes
    this.backoffMs = 1000;
    this.startPeriodicPoll();
  }

  // called whenever a user creates/edits/deletes an item locally
  onLocalChange(syncKey) {
    this.queue.add(syncKey);
    // small buffer so rapid multi-changes collapse
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flushQueue(), 1200); // 1.2s buffer
  }

  // flush queue and run sync worker
  async flushQueue() {
    if (this.syncInProgress || this.queue.size === 0) return;
    this.syncInProgress = true;
    const jobs = Array.from(this.queue);
    this.queue.clear();
    try {
      for (const job of jobs) {
        await this.performSync(job); // implement actual sync logic
      }
      this.backoffMs = 1000; // reset backoff on success
    } catch (err) {
      console.error('Sync failed', err);
      // push failed jobs back in queue
      jobs.forEach(j => this.queue.add(j));
      // exponential backoff before next attempt
      await sleep(this.backoffMs);
      this.backoffMs = Math.min(this.backoffMs * 2, 60_000);
    } finally {
      this.syncInProgress = false;
    }
  }

  async performSync(job) {
    // job contains what-to-sync (googleCalendarId, notionPageId, direction, etc.)
    // implement existing API calls here; ensure tokens are current (refresh if needed)
  }

  startPeriodicPoll() {
    this.pollTimer = setInterval(() => {
      // enqueue a full sync job that checks for remote changes
      this.queue.add('full-poll'); // implement logic for 'full-poll'
      this.flushQueue();
    }, this.pollIntervalMs);
  }

  stop() {
    clearInterval(this.pollTimer);
    clearTimeout(this.debounceTimer);
  }
}

module.exports = new SyncManager();

```
Notes / acceptance:
No user setting for auto-sync — it always runs.
Immediate on-change (debounced ~1–2s).
Periodic poll every 5 min.
Retry/backoff on error.
Persist lastSyncAt per account in local storage for diagnostics.
2) Custom border & native window controls (close/max/min) — implement frameless window + custom titlebar
Goal: app window has dark grey border and white control buttons (close/max/min). No native menu bar visible.
Main process (electron-main.js) changes:
```
const { app, BrowserWindow, Menu } = require('electron');
Menu.setApplicationMenu(null); // remove File/Edit/View default menu

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,                // remove native frame
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  // do NOT call win.webContents.openDevTools() in production
  win.loadFile('src/index.html');
}

```
Preload (src/preload.js):
```
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized')
});

```
Main process IPC handlers:
```
ipcMain.handle('window-minimize', () => win.minimize());
ipcMain.handle('window-maximize', () => {
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.handle('window-close', () => win.close());
ipcMain.handle('window-is-maximized', () => win.isMaximized());

```
Renderer (custom titlebar HTML + CSS):
Create a fixed top bar with dark-grey border #1f1f24, add three white circular buttons for close/max/min.
Hook them to window.electronAPI.close() etc.
Ensure body content has padding-top to avoid overlap.
Important: only update UI styles, do not change app logic.
3) Remove dev/HTML properties console and default menu (File/Edit/View/Window/Help)
Goal: No menu bar, no devtools or inspector auto-opening.
Main notes (electron-main.js):
Menu.setApplicationMenu(null);
win.setMenuBarVisibility(false);
Ensure there are no calls to win.webContents.openDevTools() anywhere in production code (wrap any devtools calls behind if (process.env.MODE !== 'production')).
Ensure app.commandLine.appendSwitch('disable-features', 'AllowNativeNotifications') is NOT needed; main point is don't open DevTools.
Check: remove any webPreferences flags that cause inspector to auto-open.
4) About page content
Goal: About tab/page contains clickable site link + support email + version.
Renderer snippet (About page):
```
<div class="about-card">
  <h2>About Synk</h2>
  <p>Synk syncs Notion and Google Calendar events.</p>
  <p>Website: <a id="homepage-link" href="#">https://synk-official.com</a></p>
  <p>Support: <a id="support-mail" href="mailto:support@synk-official.com">support@synk-official.com</a></p>
  <p>Version: <span id="app-version"></span></p>
</div>

```
Renderer JS:
```
document.getElementById('homepage-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.open('https://synk-official.com'); // in app use electronAPI.openExternal if provided
});
document.getElementById('app-version').textContent = APP_VERSION; // read from injected build meta

```
If using Electron openExternal:
Expose openExternal via preload to call shell.openExternal(url).
5) Fix redirect_uri_mismatch (Google) & general OAuth popup sizing/flow
Primary cause: the redirect_uri parameter passed to Google does not exactly match the value registered in Google Cloud Console.
Rules to implement:
Always build the auth URL using process.env.GOOGLE_REDIRECT_URI (and NOT a hardcoded or computed value).
Ensure GOOGLE_REDIRECT_URI value exactly matches the one in Google Console (protocol, subdomain, path, no trailing slash unless registered).
Log the exact redirect_uri and full authUrl prior to opening the popup for debugging.
Build auth URL (sample function — put where you generate Google auth):
```
function buildGoogleAuthUrl({ code_challenge, state }) {
  const redirect = process.env.GOOGLE_REDIRECT_URI;
  if (!redirect) throw new Error('MISSING GOOGLE_REDIRECT_URI env var');
  const scope = encodeURIComponent('openid email profile https://www.googleapis.com/auth/calendar.readonly');
  return [
    'https://accounts.google.com/o/oauth2/v2/auth',
    `?client_id=${process.env.GOOGLE_CLIENT_ID}`,
    `&redirect_uri=${encodeURIComponent(redirect)}`,
    '&response_type=code',
    `&scope=${scope}`,
    '&access_type=offline',
    '&prompt=consent%20select_account',
    `&state=${state}`,
    `&code_challenge=${code_challenge}`,
    '&code_challenge_method=S256'
  ].join('');
}

```
Important:
Before opening popup, print (in logs) two lines:
console.log('Using GOOGLE_REDIRECT_URI=', process.env.GOOGLE_REDIRECT_URI);
console.log('Google Auth URL=', authUrl);
Confirm the printed GOOGLE_REDIRECT_URI is exactly the same string as what you registered in Google Cloud Console (copy-paste match).
Opening popup:
Production (DEMO_MODE=false) — MUST open system browser to comply with Google verification:
```
const { shell } = require('electron');
shell.openExternal(authUrl); // opens user's browser (compliant)

```
The UI should show a small "Waiting for authentication..." modal inside the app while user completes sign-in in browser.
Dev/demo (DEMO_MODE=true) — you may open a smaller BrowserWindow for convenience to test:
```
const authWin = new BrowserWindow({ parent: win, modal: false, width: 520, height: 700, webPreferences: { nodeIntegration: false, contextIsolation: true }});
authWin.loadURL(authUrl);

```
But do NOT use this in production for Google verification — the production path must use shell.openExternal.
Callback / loopback
If redirect points to http://localhost:3000/..., ensure the app starts a local loopback server listening on that port and captures the code.
If redirect points to https://synk-official.com/..., ensure your hosted endpoint receives the code and that the app polls your server or you use the hosted relay to finish token exchange.
Common pitfalls & how to avoid
Trailing slash mismatch: https://synk-official.com/oauth/google/callback vs https://synk-official.com/oauth/google/callback/ — the strings must match exactly.
Using http://127.0.0.1 vs http://localhost — register whichever you will actually use.
Not URL-encoding redirect_uri in the auth URL — use encodeURIComponent.
Not logging the auth URL — always log it temporarily to confirm.
Pull the updated branch / changes in synk-fixed.
Create/update .env and ensure exact redirect URIs are present in providers:
For testing:
```
DEMO_MODE=true
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
NOTION_REDIRECT_URI=http://localhost:3000/oauth/notion/callback

```
For production:
```
DEMO_MODE=false
GOOGLE_REDIRECT_URI=https://synk-official.com/oauth/google/callback
NOTION_REDIRECT_URI=https://synk-official.com/oauth/notion/callback
```
Confirm the Google Cloud Console OAuth client has the exact production redirect URL registered (copy-paste from env). If mismatch persists, paste the printed GOOGLE_REDIRECT_URI from logs into the Authorized Redirect URIs in Google Console and save.
Avoid repeating steps you've already taken.

## Task State
working

## Complete Conversation Summary
This conversation involved implementing 5 specific fixes for the Synk Electron application, a tool that synchronizes Notion and Google Calendar events. The user requested continuation of work on these fixes in the `c:\Users\david\Desktop\synk\synk-fixed\` directory.

**Fix 0 - Environment & Guard Rails**: Enhanced the configuration system to properly handle MODE/DEMO_MODE behavior. Updated `src/config.js` to validate all required environment variables at startup (NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_REDIRECT_URI, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI) with clear error logging. Added methods to determine whether to use system browser (production) or popup windows (demo mode) based on DEMO_MODE setting.

**Fix 1 - Auto-sync Behavior**: Created a comprehensive `src/syncManager.js` implementing automatic synchronization with immediate response (1.2s debounced) and 5-minute periodic polling fallback. The SyncManager includes job queuing, exponential backoff on errors, and persistent sync timestamps using electron-store. Integrated the SyncManager into the main process with proper startup/shutdown lifecycle management and IPC handlers for manual sync triggers and status monitoring.

**Fix 2 - Custom Border & Native Window Controls**: Implemented a frameless window with custom titlebar. Modified the main process to remove native frames and menus using `Menu.setApplicationMenu(null)` and `frame: false`. Added custom titlebar HTML/CSS with dark grey background (#1f1f24) and circular control buttons (close/minimize/maximize). Implemented proper IPC handlers for window controls and updated the preload script to expose window management functions. Added proper padding to prevent content overlap with the custom titlebar.

**Fix 3 - Remove Dev Console & Default Menu**: Ensured no menu bars or DevTools auto-opening in production. Wrapped DevTools calls with production environment checks (`process.env.NODE_ENV !== 'production'`) and confirmed menu removal implementation. This ensures a clean production experience without development tools.

**Fix 4 - About Page Content**: Updated the About tab with proper content including clickable website link (https://synk-official.com), support email (support@synk-official.com), and version display. Implemented proper link handlers using `electronAPI.openExternal()` for external links while maintaining mailto: functionality for the support email.

**Fix 5 - OAuth Redirect URI Fix**: Completely rewrote OAuth URL builders to use exact environment variables (`process.env.GOOGLE_REDIRECT_URI` and `process.env.NOTION_REDIRECT_URI`) instead of computed values. Added critical logging to debug redirect_uri_mismatch errors. Implemented DEMO_MODE-based OAuth flow behavior: system browser for production (required for Google verification compliance) and popup windows for demo/testing. Updated .env files with exact redirect URIs for both testing and production environments.

**Key Technical Implementations**:
- SyncManager with job queuing, debouncing, and exponential backoff
- Frameless Electron window with custom titlebar and window controls
- Environment-based OAuth flow switching (system browser vs popup)
- Comprehensive environment variable validation with clear error messages
- Proper IPC communication between main and renderer processes
- Integration of electron-store for persistent sync data storage

**Files Modified**: The implementation touched multiple critical files including the main process (`main-oauth-fixed.js`), configuration system (`src/config.js`), OAuth URL builders (`src/oauth-urls.js`), preload script (`src/preload.js`), main HTML file (`src/index.html`), and environment configuration files (`.env`, `.env.development`, `.env.production`).

**Current Status**: All 5 fixes have been successfully implemented. The application now supports proper environment-based behavior switching, automatic synchronization, custom UI with native window controls, clean production builds without dev tools, comprehensive About page, and robust OAuth flows that should resolve redirect_uri_mismatch errors. The electron-store dependency was installed to support the SyncManager functionality.

## Important Files to View

- **c:\Users\david\Desktop\synk\synk-fixed\src\syncManager.js** (lines 1-50)
- **c:\Users\david\Desktop\synk\synk-fixed\main-oauth-fixed.js** (lines 31-70)
- **c:\Users\david\Desktop\synk\synk-fixed\main-oauth-fixed.js** (lines 95-135)
- **c:\Users\david\Desktop\synk\synk-fixed\src\config.js** (lines 74-104)
- **c:\Users\david\Desktop\synk\synk-fixed\src\oauth-urls.js** (lines 5-29)
- **c:\Users\david\Desktop\synk\synk-fixed\src\index.html** (lines 24-76)
- **c:\Users\david\Desktop\synk\synk-fixed\src\index.html** (lines 551-559)
- **c:\Users\david\Desktop\synk\synk-fixed\.env** (lines 21-31)

