const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const isDev = !app.isPackaged; // Simple check for development mode

// Check if we are in development mode by environment variable if !app.isPackaged is not enough
// or check if 'vite' is running.
// For this setup, we'll assume isDev based on packaging.
// But mostly users run 'npm start' which runs 'electron .'
// We need to know if we should load localhost or file.

// Better way: pass an argument or environment variable.
// In package.json scripts: "start": "electron ."
// If we want dev, we usually run "npm run dev" (vite) and "npm run start" (electron) in parallel.
// To make it easier, we can try to connect to localhost first, or fall back?
// Or just hardcode for now based on a check.
// Let's assume if env var NODE_ENV is 'development', we use localhost.
// But we didn't set that.

// Let's use a try-catch approach or just assume dev if not packaged?
// Re-reading implementation plan: "Load http://localhost:5173 in development."

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      // Allows use of Node.js modules in the renderer process (security risk, but needed for simple apps)
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  // Load the app.
  // In development (Vite running), load localhost.
  // In production, load index.html from dist (or root if we build there).

  // We can try to fetch localhost, if it fails, load file? No that's slow.
  // Let's rely on an environment variable we can set in package.json
  // But I can't easily change how the user runs it without adding packages like cross-env or concurrently.
  // I will assume if the file 'dist/index.html' exists, we might be in prod?
  // Or I can just check if I can connect?

  // Simplest for now: check an env var that I can't easily set?
  // Let's just try to load the URL if it's not packaged.

  if (!app.isPackaged) {
    // Development
    // mainWindow.loadURL('http://localhost:5173');
    // Note: User needs to run `npm run dev` separately.
    // To make it robust, we should probably start the vite server from electron? No.
    // I will set it to load local index.html if it can't find localhost?

    // Let's just try localhost. The user has to run npm run dev.
    mainWindow.loadURL('http://localhost:5173').catch(e => {
      console.log('Could not load localhost:5173, is Vite running?');
      // Fallback to file just in case they just ran electron without vite
      mainWindow.loadFile('index.html');
    });

    // Open DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // Production (packaged)
    // When built, Vite puts result in dist/
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
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