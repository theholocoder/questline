import { join } from 'node:path';
import { strings } from '@questline/ui/strings';
import { app, BrowserWindow } from 'electron';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    title: strings.appName,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
    },
  });

  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  if (!app.isPackaged && devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(join(import.meta.dirname, '../renderer/index.html'));
  }
}

void app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
