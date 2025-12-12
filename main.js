const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

// Window state file path
const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    if (fs.existsSync(stateFilePath)) {
      const data = fs.readFileSync(stateFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load window state:', e);
  }
  return null; // Return null if no state or error
}

function saveWindowState(state) {
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save window state:', e);
  }
}

function createWindow() {
  // Load previous state
  const windowState = loadWindowState();

  // Default dimensions
  let { width, height } = screen.getPrimaryDisplay().workAreaSize;
  width = 1200;
  height = 800;

  // Use saved state if available
  let x, y;
  if (windowState) {
    width = windowState.width;
    height = windowState.height;
    x = windowState.x;
    y = windowState.y;
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'public/assets/img/favicon.ico'),
    show: false // Don't show immediately to avoid flickering if we maximize
  });

  // Remove the default menu
  mainWindow.removeMenu();

  // Restore maximized state if applicable
  if (windowState && windowState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app.
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173').catch(e => {
      console.log('Could not load localhost:5173, is Vite running?');
      mainWindow.loadFile('index.html');
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // --- Save Window State Logic ---
  const saveState = () => {
    if (!mainWindow.isDestroyed()) {
      try {
        const isMaximized = mainWindow.isMaximized();
        // Use getNormalBounds if maximized to save the restored size
        const bounds = isMaximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();

        saveWindowState({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized
        });
      } catch (e) {
        console.error('Error saving window state:', e);
      }
    }
  };

  // Save state when the window is about to close
  mainWindow.on('close', saveState);

  // --- IPC Handlers for Window Controls ---
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });
}

// When Electron is ready, create the window.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, recreate the window if none are open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC Handlers for Run on Startup
ipcMain.handle('get-startup-setting', () => {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
});

ipcMain.on('set-startup-setting', (event, openAtLogin) => {
  app.setLoginItemSettings({
    openAtLogin: openAtLogin,
    path: app.getPath('exe'), // Optional: Explicitly set the path to the executable
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});