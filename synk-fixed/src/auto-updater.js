const { autoUpdater } = require('electron-updater');
const { ipcMain, dialog } = require('electron');
const Store = require('electron-store');

const settings = new Store({
  name: 'settings',
  defaults: {
    'update-preference': 'prompt', // 'prompt' | 'auto' | 'manual'
    'update-skip-version': null,
    'update-remind-at': 0
  }
});

class AutoUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.setupAutoUpdater();
    this.registerIpc();
  }

  getUpdateSummary(version) {
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(__dirname, 'update-log.json');
      const raw = fs.readFileSync(logPath, 'utf-8');
      const json = JSON.parse(raw);
      const entry = (json.updates || []).find(u => u.version === version);
      if (!entry) return 'New improvements and fixes.';
      const parts = [];
      if (entry.features && entry.features.length) parts.push('Features:\n- ' + entry.features.join('\n- '));
      if (entry.improvements && entry.improvements.length) parts.push('Improvements:\n- ' + entry.improvements.join('\n- '));
      if (entry.fixes && entry.fixes.length) parts.push('Fixes:\n- ' + entry.fixes.join('\n- '));
      return parts.join('\n\n');
    } catch (e) {
      return 'New improvements and fixes.';
    }
  }

  setupAutoUpdater() {
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;

    autoUpdater.on('update-available', (info) => {
      const skip = settings.get('update-skip-version');
      if (skip && skip === info.version) {
        return; // user chose to skip this version
      }
      this.mainWindow.webContents.send('update-available', info);

      const pref = settings.get('update-preference');
      if (pref === 'auto') {
        autoUpdater.autoDownload = true;
        autoUpdater.downloadUpdate();
      } else if (pref === 'prompt') {
        this.showUpdatePrompt(info);
      } else {
        // manual: do nothing until user clicks
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.mainWindow.webContents.send('update-downloaded', info);
      this.showUpdateReadyDialog(info);
    });

    autoUpdater.on('error', (err) => {
      this.mainWindow.webContents.send('update-error', err);
      console.error('Update error:', err);
    });

    autoUpdater.on('download-progress', (progress) => {
      this.mainWindow.webContents.send('download-progress', progress);
    });

    // immediate initial check based on preference
    this.initialCheck();

    // periodic checks every 24h
    this.checkTimer = setInterval(() => this.checkForUpdates(), 24 * 60 * 60 * 1000);
  }

  initialCheck() {
    const pref = settings.get('update-preference');
    if (pref === 'manual') return;

    // respect reminder schedule
    const remindAt = Number(settings.get('update-remind-at') || 0);
    if (Date.now() < remindAt) return;

    this.checkForUpdates();
  }

  async checkForUpdates() {
    const pref = settings.get('update-preference');
    try {
      if (pref === 'auto') {
        autoUpdater.autoDownload = true;
        await autoUpdater.checkForUpdates();
      } else if (pref === 'prompt') {
        autoUpdater.autoDownload = false;
        const result = await autoUpdater.checkForUpdates();
        // electron-updater returns UpdateCheckResult
        if (result && result.updateInfo && result.updateInfo.version) {
          const current = (require('electron').app.getVersion());
          const remoteV = result.updateInfo.version;
          if (remoteV !== current) {
            this.showUpdatePrompt(result.updateInfo);
          }
        }
      } else {
        // manual: only check when explicitly asked via IPC
      }
    } catch (e) {
      console.error('checkForUpdates failed', e);
    }
  }

  scheduleReminder(ms) {
    const when = Date.now() + Math.max(60 * 1000, Number(ms));
    settings.set('update-remind-at', when);
  }

  downloadUpdate() {
    autoUpdater.downloadUpdate();
  }

  showUpdatePrompt(info) {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available 🚀',
      message: `${require('electron').app.getName()} v${info.version} is available!`,
      detail: this.getUpdateSummary(info.version),
      buttons: ['Download Now', 'Remind Me Tomorrow', 'Skip This Version'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        this.downloadUpdate();
      } else if (result.response === 1) {
        this.scheduleReminder(24 * 60 * 60 * 1000);
      } else if (result.response === 2) {
        settings.set('update-skip-version', info.version);
      }
    });
  }

  showUpdateReadyDialog(info) {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `${require('electron').app.getName()} v${info.version} is ready to install.`,
      detail: 'The update will be applied after you restart the application.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1}
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  }

  registerIpc() {
    ipcMain.handle('check-for-updates', async () => {
      await this.checkForUpdates();
      return { ok: true };
    });
    ipcMain.handle('set-update-preference', (e, pref) => {
      if (['prompt', 'auto', 'manual'].includes(pref)) {
        settings.set('update-preference', pref);
        return { ok: true };
      }
      return { ok: false };
    });
    ipcMain.handle('get-update-preference', () => {
      return settings.get('update-preference');
    });
  }
}

module.exports = AutoUpdater;