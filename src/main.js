const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("node:path");

function getWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.handle("ollama:tags", async (_event, host) => {
  const response = await fetch(`${host}/api/tags`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}.`);
  }

  return response.json();
});

ipcMain.handle("ollama:chat", async (_event, { host, model, messages }) => {
  const response = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}.`);
  }

  return response.json();
});

ipcMain.handle("window:minimize", (event) => {
  getWindow(event)?.minimize();
});

ipcMain.handle("window:toggle-maximize", (event) => {
  const window = getWindow(event);

  if (!window) {
    return false;
  }

  if (window.isMaximized()) {
    window.unmaximize();
    return false;
  }

  window.maximize();
  return true;
});

ipcMain.handle("window:close", (event) => {
  getWindow(event)?.close();
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#111210",
    title: "Qwen Ollama",
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
