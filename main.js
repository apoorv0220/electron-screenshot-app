const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

let mainWindow = null;
let tray = null;
const SESSION_ID = uuidv4();
const UPLOAD_URL = 'https://screenshot-dashboard.onrender.com//api/upload';
const SCREENSHOTS_DIR = path.join(app.getPath('userData'), 'screenshots');
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const TOTAL_MINUTES = 10;
const SCREENSHOT_INTERVAL = 60000;
const APP_TIMEOUT = TOTAL_MINUTES * SCREENSHOT_INTERVAL;

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function handleAppError(error, message) {
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

const captureScreenshot = async (minute) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotFilename = `screenshot_${SESSION_ID}_${minute}_${timestamp}.png`;
    const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotFilename);

    let cmd;
    if (isMac) {
        cmd = `screencapture -x "${screenshotPath}"`;
    } else if (isWindows) {
        const nircmdPath = app.isPackaged ? path.join(process.resourcesPath, 'nircmd.exe') : path.join(app.getAppPath(), 'resources', 'nircmd.exe');
        cmd = `"${nircmdPath}" savescreenshot "${screenshotPath}"`;
    } else {
        handleAppError(new Error("Unsupported platform"), "Screenshot capture is not supported on this operating system.");
        return;
    }

    try {
        await new Promise((resolve, reject) => {
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
    } catch (error) {
        handleAppError(error, `Failed to capture or upload screenshot for minute ${minute}:`);
    }
};

const uploadScreenshot = async (filePath, filename) => {
    try {
        const fileBuffer = fs.readFileSync(filePath);

        const formData = new FormData();
        formData.append('image', fileBuffer, filename);
        formData.append('sessionId', SESSION_ID);
        formData.append('email', "test@test.com");

        await axios.post(UPLOAD_URL, formData, {
            headers: {
                ...formData.getHeaders()
            },
        });

        console.log(`Screenshot ${filename} uploaded successfully.`);
    } catch (error) {
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
    const iconPath = path.join(__dirname, 'tray_icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => { if (mainWindow) mainWindow.show(); } },
        { label: 'Quit', click: () => {
            app.isQuitting = true;
            app.quit();
        } }
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
    let timeLeft = APP_TIMEOUT / 1000;

    const intervalId = setInterval(async () => {
        screenshotCount++;
        await captureScreenshot(screenshotCount);

        if (mainWindow) {
            mainWindow.webContents.send('screenshot-count-update', screenshotCount);
        }

        if (screenshotCount >= 10) {
            clearInterval(intervalId);
            console.log("Screenshot capture completed. Quitting in 5 seconds...");

            setTimeout(() => {
                console.log("Quitting the application...");
                app.isQuitting = true;
                app.quit();
            }, 5000);
        }
    }, SCREENSHOT_INTERVAL);

    const timerIntervalId = setInterval(() => {
        timeLeft--;
        if (mainWindow) {
            mainWindow.webContents.send('timer-update', timeLeft);
        }

        if (timeLeft <= 0) {
            clearInterval(timerIntervalId);
        }
    }, 1000);


    mainWindow?.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });

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