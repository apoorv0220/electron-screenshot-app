import { app, BrowserWindow, Tray, Menu, nativeImage, dialog } from 'electron';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const SESSION_ID = uuidv4();
const UPLOAD_URL = 'http://localhost:3000/api/upload';
const SCREENSHOTS_DIR = path.join(app.getPath('userData'), 'screenshots');
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function handleAppError(error: any, message: string) {
    console.error(message, error);
    dialog.showErrorBox('Application Error', `${message}\n\n${error.message || error}`); 
}

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
    });

    mainWindow.loadFile('index.html');
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

const captureScreenshot = async (minute: number) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotFilename = `screenshot_${SESSION_ID}_${minute}_${timestamp}.png`;
    const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotFilename);

    let cmd: string;
    if (isMac) {
        cmd = `screencapture -x "${screenshotPath}"`;
    } else if (isWindows) {
        cmd = `nircmd.exe savescreenshot "${screenshotPath}"`;
    } else {
        handleAppError(new Error("Unsupported platform"), "Screenshot capture is not supported on this operating system.");
        return;
    }

    try {
        await new Promise<void>((resolve, reject) => {
            exec(cmd, (error) => {
                if (error) {
                    console.error(`Error capturing screenshot for minute ${minute}:`, error);
                    reject(error);
                } else {
                    console.log(`Screenshot for minute ${minute} captured: ${screenshotPath}`);
                    resolve();
                }
            });
        });

        await uploadScreenshot(screenshotPath, screenshotFilename);
    } catch (error: any) {
        handleAppError(error, `Failed to capture or upload screenshot for minute ${minute}:`);
    }
};

const uploadScreenshot = async (filePath: string, filename: string) => {
    try {
        const fileStream = fs.createReadStream(filePath);
        const formData = new FormData();
        formData.append('image', fileStream, filename);
        formData.append('sessionId', SESSION_ID);

        await axios.post(UPLOAD_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log(`Screenshot ${filename} uploaded successfully.`);
    } catch (error: any) {
        handleAppError(error, `Error uploading screenshot ${filename}:`);
    } finally {
        try {
            fs.unlinkSync(filePath);
        } catch (unlinkError) {
            console.warn(`Failed to delete local file ${filePath}:`, unlinkError);
        }
    }
};


const createTray = () => {
    const iconPath = path.join(__dirname, isMac ? 'tray_icon_mac.png' : 'tray_icon.png'); // 
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => { if (mainWindow) mainWindow.show(); } },
        { label: 'Quit', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('Screenshot Monitor');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
        }
    });
};


app.whenReady().then(() => {
    createWindow();
    createTray();

    let screenshotCount = 0;

    const intervalId = setInterval(async () => {
        screenshotCount++;
        await captureScreenshot(screenshotCount);

        if (screenshotCount >= 10) {
            clearInterval(intervalId);
            setTimeout(() => {
              app.quit();
            }, 5000);
        }
    }, 60000);


    // mainWindow?.on('close', (event) => {
    //     event.preventDefault();
    //     mainWindow?.hide();
    // });

});

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});