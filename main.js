const { app, BrowserWindow, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data'); // Import form-data

let mainWindow = null;
let tray = null;
const SESSION_ID = uuidv4();
const UPLOAD_URL = 'http://localhost:3000/api/upload'; // Make sure your Next.js server is running here.
const SCREENSHOTS_DIR = path.join(app.getPath('userData'), 'screenshots');
const isMac = process.platform === 'darwin'; // Check if it's macOS
const isWindows = process.platform === 'win32';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Function to handle errors and display them to the user
function handleAppError(error, message) {
    console.error(message, error);
    dialog.showErrorBox('Application Error', `${message}\n\n${error.message || error}`); // Show error dialog
}

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false, //  Important for security
            contextIsolation: true, //  Important for security
            preload: path.join(__dirname, 'preload.js')
        },
    });

    mainWindow.loadFile('index.html');
    // Open DevTools - Remove for PRODUCTION!
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
        // Ensure nircmd.exe is available.  Package it with your app or provide instructions to install it.
        const nircmdPath = path.join(app.getAppPath(), 'resources', 'nircmd.exe');
        cmd = `"${nircmdPath}" savescreenshot "${screenshotPath}"`; // Quote the path!
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
        // Read the file into a Buffer
        const fileBuffer = fs.readFileSync(filePath);

        const formData = new FormData();
        formData.append('image', fileBuffer, filename); // Append the Buffer
        formData.append('sessionId', SESSION_ID);
        formData.append('email', "test@test.com");

        await axios.post(UPLOAD_URL, formData, {
            headers: {
                ...formData.getHeaders()
            },
        });

        console.log(`Screenshot ${filename} uploaded successfully.`);
    } catch (error) {
        handleAppError(error, `Error uploading screenshot ${filename}:`); // Use handleAppError
        // Optionally:  Implement retry logic or user notification
    } finally {
        // Clean up local file after upload (optional)
        try {
            fs.unlinkSync(filePath);
        } catch (unlinkError) {
            console.warn(`Failed to delete local file ${filePath}:`, unlinkError); // Non-fatal, so warn instead of error
        }
    }
};


const createTray = () => {
    const iconPath = path.join(__dirname, isMac ? 'tray_icon_mac.png' : 'tray_icon.png'); // Different icons for different platforms
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
            }, 5000); // Add a small delay before quitting to ensure uploads finish
        }
    }, 60000);


    // Optionally prevent closing the main window from quitting the app
    // mainWindow?.on('close', (event) => {
    //     event.preventDefault();
    //     mainWindow?.hide(); // Hide the window instead of closing
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