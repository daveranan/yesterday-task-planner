const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Allows use of Node.js modules in the renderer process (security risk, but needed for simple apps)
      nodeIntegration: true, 
      contextIsolation: false,
    }
  });

  // Load the index.html file of the app.
  // Note: This assumes you will compile your React component into a 'build' folder.
  // We'll load the local index.html wrapper.
  mainWindow.loadFile('index.html');

  // Open the DevTools automatically for debugging.
  // mainWindow.webContents.openDevTools();
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

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});