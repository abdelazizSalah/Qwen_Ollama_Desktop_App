# Qwen Ollama Desktop

A small Electron desktop app with a Codex-inspired interface for chatting with a local Ollama Qwen model.

## Requirements

- Node.js
- Ollama running locally
- Your Qwen model installed in Ollama:

```powershell
ollama run huihui_ai/qwen3-coder-abliterated:30b
```

## Run

```powershell
npm install
npm start
```

The app connects to `http://localhost:11434` and uses `huihui_ai/qwen3-coder-abliterated:30b` by default. You can change the host and model from the compact settings panel in the UI.

## Skills

The sidebar includes local skills. A skill is a reusable system instruction that guides the model for the active chat. Select a skill before chatting, or use the plus button in the Skills section to create your own.
