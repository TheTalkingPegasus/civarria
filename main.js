// Civarria – Desktop-Hülle: eigenes Fenster, volle Grafikkarte, Spielstände als Dateien, Updates über GitHub
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path'), fs = require('fs');

// Grafikkarte voll nutzen (auch wenn Treiber auf der Sperrliste stehen) und die starke GPU bevorzugen
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

const SAVES = path.join(app.getPath('documents'), 'Civarria', 'Spielstände');
const SETTINGS = path.join(app.getPath('userData'), 'einstellungen.json');
let win, settings = { fullscreen: false, bounds: null };
try { settings = { ...settings, ...JSON.parse(fs.readFileSync(SETTINGS, 'utf8')) }; } catch (e) {}
const keepSettings = () => { try { fs.writeFileSync(SETTINGS, JSON.stringify(settings)); } catch (e) {} };

function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 1024, minHeight: 640, ...(settings.bounds || {}),
    backgroundColor: '#15171c', title: 'Civarria', show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false, contextIsolation: true, sandbox: false }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => { if (settings.fullscreen) win.setFullScreen(true); win.show(); });
  win.on('close', () => { settings.fullscreen = win.isFullScreen(); if (!settings.fullscreen && !win.isMaximized()) settings.bounds = win.getBounds(); keepSettings(); });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  const menu = Menu.buildFromTemplate([
    { label: 'Spiel', submenu: [
      { label: 'Vollbild', accelerator: 'F11', click: () => win.setFullScreen(!win.isFullScreen()) },
      { label: 'Spielstand-Ordner öffnen', click: () => { fs.mkdirSync(SAVES, { recursive: true }); shell.openPath(SAVES); } },
      { label: 'Nach Updates suchen', click: () => checkUpdates(true) },
      { type: 'separator' },
      { label: 'Entwicklerwerkzeuge', accelerator: 'Ctrl+Shift+I', click: () => win.webContents.toggleDevTools() },
      { label: 'Beenden', role: 'quit' }
    ] }
  ]);
  Menu.setApplicationMenu(menu);
  win.setMenuBarVisibility(false); // Alt blendet das Menü ein
}

// Spielstände als Dateien unter Dokumente\Civarria\Spielstände
const safe = n => String(n).replace(/[^\w\-äöüÄÖÜß ]/g, '_');
ipcMain.handle('save', async (e, name, str) => {
  try { fs.mkdirSync(SAVES, { recursive: true }); const f = path.join(SAVES, safe(name) + '.json'); fs.writeFileSync(f + '.tmp', str); fs.renameSync(f + '.tmp', f); return true; }
  catch (err) { return false; }
});
ipcMain.handle('load', async (e, name) => { try { return fs.readFileSync(path.join(SAVES, safe(name) + '.json'), 'utf8'); } catch (err) { return null; } });
ipcMain.handle('version', () => app.getVersion());

// Automatische Updates über GitHub-Releases
let updater = null;
function checkUpdates(manual) {
  if (!app.isPackaged) { if (manual) dialog.showMessageBox(win, { message: 'Updates gibt es nur in der installierten Version.' }); return; }
  if (!updater) {
    updater = require('electron-updater').autoUpdater;
    updater.autoDownload = true;
    updater.on('update-downloaded', info => {
      dialog.showMessageBox(win, { type: 'info', buttons: ['Jetzt neu starten', 'Später'], defaultId: 0,
        title: 'Update bereit', message: `Civarria ${info.version} ist heruntergeladen.`, detail: 'Speichere vorher dein Spiel. Beim nächsten Start ist die neue Version aktiv – oder jetzt sofort neu starten.' })
        .then(r => { if (r.response === 0) updater.quitAndInstall(); });
    });
    updater.on('update-not-available', () => { if (updater._manual) dialog.showMessageBox(win, { message: 'Du hast bereits die neueste Version.' }); });
    updater.on('error', err => { if (updater._manual) dialog.showMessageBox(win, { type: 'warning', message: 'Update-Suche fehlgeschlagen.', detail: String(err) }); });
  }
  updater._manual = manual;
  updater.checkForUpdates().catch(() => {});
}

app.whenReady().then(() => { createWindow(); setTimeout(() => checkUpdates(false), 4000); });
app.on('window-all-closed', () => app.quit());
