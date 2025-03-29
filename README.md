**README for Electron Screenshot App**

# Electron Screenshot App

This is a simple Electron desktop application that captures screenshots every minute for a 10-minute period and uploads them to a backend server.

## Tech Stack

*   **Electron:** A framework for building cross-platform desktop applications with JavaScript, HTML, and CSS.
*   **JavaScript:** The programming language used to build the application logic.
*   **Node.js:** The JavaScript runtime environment used by Electron.
*   **Axios:** A promise-based HTTP client for making API requests.
*   **uuid:** For generating unique identifiers.
*   **form-data:** To send the screenshot via a post request.

## Built application Usage

1.  **Download dist:** Download the built app from: ([https://drive.google.com/drive/folders/1HJqw_Gwvu2VwRvpFruGove-aS8qSwIKo?usp=drive_link](https://drive.google.com/drive/folders/1-bZCiEw1xQw7zsF1AUzkus4o0_q22OFf?usp=drive_link))
2.  **Install the application:** Install the application through the Electro Screenshot App Setup executable.
3.  **Run the application:** After installing the application, run the executable from install directory.
4.  **Window and System Tray Icon:** The application will run in a window while also being present in the system tray. Note: App needs to be closed from system tray.
5.  **Screenshot Capture:** The application will capture a screenshot every minute for 10 minutes.
6.  **Screenshot Upload:** Each screenshot will be uploaded to the backend server specified by the `UPLOAD_URL` variable in `main.js`.
7.  **Automatic Exit:** The application will automatically exit after 10 minutes.

## Source code Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd electron-screenshot-app
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Start the application:**

    ```bash
    npm start
    ```

## Source Code Usage

1.  **Run the application:** After installing the dependencies, start the application using `npm start` or `yarn start`.
2.  **System Tray Icon:** The application will run in the system tray.
3.  **Screenshot Capture:** The application will capture a screenshot every minute for 10 minutes.
4.  **Screenshot Upload:** Each screenshot will be uploaded to the backend server specified by the `UPLOAD_URL` variable in `main.js`.
5.  **Automatic Exit:** The application will automatically exit after 10 minutes.

## Packaging for Distribution

To package the application for distribution, use `electron-builder`:

1.  **Run the build script:**

    ```bash
    npm run build
    ```

    This will create distributable packages for your application in the `dist` directory.

## Troubleshooting

*   **`nircmd.exe`:** On Windows, the application relies on `nircmd.exe` for capturing screenshots. Make sure that `nircmd.exe` is included in the `resources` directory of your project and that the path to `nircmd.exe` is correctly specified in `main.js`.
*   **Permissions:** The application might require certain permissions to capture screenshots. Make sure that the user account running the application has the necessary permissions.
*   **Network Connectivity:** The application needs to be able to connect to the backend server to upload screenshots. Make sure that there are no firewall rules or network issues blocking the connection.

## Contributing

Contributions are welcome! Please submit a pull request with your changes.
