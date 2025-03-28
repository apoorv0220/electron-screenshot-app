import { app, BrowserWindow, Tray, Menu } from "electron";
import path from 'path';
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { error } from "console";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
};

const captureScreenshot = (minute) => {
    const timestamp = new Date().toISOString.replace(/[:.]/g, '-');
    const screenshotPath = path.join(__dirname, `screenshot_${minute}_${timestamp}.png`);

    const cmd = process.platform == 'darwin' ? `screencapture -x ${screenshotPath}` : `nircmd.exe savescreenshot ${screenshotPath}`;

    exec(cmd, (error) => {
        if(error) {
            console.error(`Error capturing screenshot for minute ${minute}:`, error);
            return;
        }
        console.log(`Screenshot for minute ${minute} captured: ${screenshotPath}`);
    });
}

app.whenReady().then(() => {
    createWindow();

    const tray = new Tray(path.join(__dirname, 'tray_icon.png'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Quit', role: 'quit' }
    ]);
    tray.setToolTip('Screenshot Monitor');
    tray.setContextMenu(contextMenu);

    for(let i = 1; i <= 10; i++) {
        setTimeout(() => captureScreenshot(i), i * 60000)
    }

    setTimeout(() => {
        app.quit();
    }, 10 * 60000);
});

app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') {
        app.quit();
    }
});