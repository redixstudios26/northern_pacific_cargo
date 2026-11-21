const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');

const port = 4173;
const address = `http://127.0.0.1:${port}`;
let serverProcess;
let mainWindow;

async function startLocalServer() {
  const serverFile = app.isPackaged
    ? path.join(process.resourcesPath, 'server', 'server.js')
    : path.join(__dirname, '..', '.next', 'standalone', 'server.js');

  const logPath = path.join(app.getPath('userData'), 'server.log');
  serverProcess = spawn(process.execPath, [serverFile], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', HOSTNAME: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  for (const stream of [serverProcess.stdout, serverProcess.stderr]) {
    stream.on('data', (chunk) => fs.appendFile(logPath, chunk, () => {}));
  }
  serverProcess.on('error', (error) => {
    fs.appendFileSync(logPath, `\nCould not start the local app server: ${error.stack || error}\n`);
  });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (serverProcess.exitCode !== null) throw new Error(`The local app server stopped before it was ready. See ${logPath}`);
    try {
      const response = await fetch(address);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`The local app server did not become ready in time. See ${logPath}`);
}

function openWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 360,
    minHeight: 600,
    title: 'Northern Pacific Cargo',
    backgroundColor: '#07111f',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadURL(address);
}

app.whenReady().then(async () => {
  try {
    await startLocalServer();
    openWindow();
  } catch (error) {
    console.error(error);
    const { dialog } = require('electron');
    dialog.showErrorBox('Northern Pacific Cargo could not start', String(error));
    app.quit();
  }
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill();
});
