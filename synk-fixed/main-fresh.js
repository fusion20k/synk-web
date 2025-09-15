const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
require('dotenv').config();

console.log('🚀 Starting Synk...');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('src/index.html');
  
  if (process.env.DEBUG === 'true') {
    mainWindow.webContents.openDevTools();
  }
}

// IPC Handlers
ipcMain.handle('start-sync', async (event, syncPairs) => {
  console.log('🔄 Sync requested:', syncPairs);
  
  try {
    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Sync completed successfully');
    return { success: true, message: 'Sync completed' };
  } catch (error) {
    console.error('❌ Sync failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-sync-stats', async () => {
  return {
    totalSyncs: 5,
    lastSync: new Date().toISOString(),
    status: 'completed'
  };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

console.log('✅ Main process loaded');