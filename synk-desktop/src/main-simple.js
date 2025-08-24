// Simple test version of Synk main process
console.log('Starting Synk...');

try {
  const electron = require('electron');
  console.log('Electron loaded:', typeof electron);
  
  const { app, BrowserWindow, Tray, Menu } = electron;
  console.log('App object:', typeof app);
  
  if (!app) {
    console.error('App object is undefined!');
    process.exit(1);
  }

  let mainWindow;
  let tray;

  function createWindow() {
    console.log('Creating window...');
    
    mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      backgroundColor: '#000000',
      autoHideMenuBar: true
    });

    mainWindow.loadFile('src/renderer/index.html');
    
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    
    console.log('Window created successfully');
  }

  function createTray() {
    console.log('Creating tray...');
    
    try {
      // Use a simple icon path
      const trayIconPath = require('path').join(__dirname, '../assets/icon.ico');
      tray = new Tray(trayIconPath);

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Open Synk',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
            } else {
              createWindow();
            }
          }
        },
        {
          label: 'Quit',
          click: () => {
            app.quit();
          }
        }
      ]);

      tray.setToolTip('Synk - Notion ↔ Google Calendar Sync');
      tray.setContextMenu(contextMenu);
      
      console.log('Tray created successfully');
    } catch (error) {
      console.error('Failed to create tray:', error.message);
    }
  }

  app.whenReady().then(() => {
    console.log('App ready, initializing...');
    createWindow();
    createTray();
  });

  app.on('window-all-closed', () => {
    // Keep running on Windows
    if (process.platform !== 'darwin') {
      console.log('All windows closed, keeping app running in tray');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  console.log('Synk main process initialized');

} catch (error) {
  console.error('Failed to initialize Synk:', error);
  process.exit(1);
}