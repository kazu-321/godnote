const process = require('node:process');
process.env.ELECTRON_DISABLE_SANDBOX = '1';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { pathToFileURL } = require('node:url');
const workspaceState = require('./workspaceState.cjs');

app.commandLine.appendSwitch('no-sandbox');
process.env.GODNOTE_ELECTRON = '1';

const frontendUrl = process.env.GODNOTE_FRONTEND_URL ?? 'http://127.0.0.1:5173';
const packagedPort = Number(process.env.GODNOTE_PACKAGED_PORT ?? 32123);
let mainWindow = null;
let serverInstance = null;

function userDataPath() {
  return app.getPath('userData');
}

function restoreLastWorkspacePath() {
  const lastWorkspace = workspaceState.getLastWorkspace(userDataPath());
  if (!lastWorkspace?.path) return null;
  const manifestPath = path.join(lastWorkspace.path, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  return lastWorkspace.path;
}

function createWindow(url) {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 768,
    autoHideMenuBar: true,
    backgroundColor: '#0f1220',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  window.loadURL(url);
  window.on('closed', () => {
    mainWindow = null;
  });
  mainWindow = window;
}

async function startPackagedServer() {
  const appPath = app.getAppPath();
  process.env.GODNOTE_PROJECT_ROOT = appPath;
  const lastWorkspacePath = restoreLastWorkspacePath();
  if (lastWorkspacePath) {
    process.env.GODNOTE_DATA_ROOT = lastWorkspacePath;
  }
  const serverModuleUrl = pathToFileURL(path.join(appPath, 'dist-server', 'server', 'app.js')).href;
  const { createApp } = await import(serverModuleUrl);
  const staticRoot = path.join(appPath, 'dist');
  const expressApp = createApp({ staticRoot });
  return await new Promise((resolve, reject) => {
    const listener = expressApp.listen(packagedPort, '127.0.0.1', () => {
      resolve({ listener, port: packagedPort });
    });
    listener.on('error', reject);
  });
}

function registerIpcHandlers() {
  ipcMain.handle('godnote:pick-workspace-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('godnote:get-last-workspace', () => workspaceState.getLastWorkspace(userDataPath()));

  ipcMain.handle('godnote:get-recent-workspaces', () => workspaceState.getRecentWorkspaces(userDataPath()));

  ipcMain.handle('godnote:save-recent-workspace', (_event, record) => {
    if (!record?.path || !record?.name) {
      throw new Error('Workspace record is incomplete.');
    }
    return workspaceState.saveRecentWorkspace(userDataPath(), record);
  });
}

async function main() {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  registerIpcHandlers();

  let urlToLoad = frontendUrl;
  if (app.isPackaged) {
    serverInstance = await startPackagedServer();
    urlToLoad = `http://127.0.0.1:${serverInstance.port}/`;
  }

  app.whenReady().then(() => {
    createWindow(urlToLoad);
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(urlToLoad);
      }
    });
  });

  app.on('window-all-closed', () => {
    if (serverInstance?.listener) {
      serverInstance.listener.close();
    }
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

main().catch((error) => {
  console.error(error);
  app.quit();
});
