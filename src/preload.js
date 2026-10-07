const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ollamaDesktop", {
  appName: "Qwen Ollama",
  getTags: (host) => ipcRenderer.invoke("ollama:tags", host),
  chat: (payload) => ipcRenderer.invoke("ollama:chat", payload)
});
