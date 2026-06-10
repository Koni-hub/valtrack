const { app, BrowserWindow } = require("electron");
const path = require("path");

// Start the Express server
const server = require("./server");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "ValTrack",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Wait for server to be ready then load
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Give server a moment to start
  setTimeout(createWindow, 500);
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
