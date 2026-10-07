const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ollamaDesktop", {
  appName: "Qwen Ollama",
  getTags: (host) => ipcRenderer.invoke("ollama:tags", host),
  chat: (payload) => ipcRenderer.invoke("ollama:chat", payload),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize"),
  closeWindow: () => ipcRenderer.invoke("window:close")
});
