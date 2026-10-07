const DEFAULT_HOST = "http://localhost:11434";
const DEFAULT_MODEL = "huihui_ai/qwen3-coder-abliterated:30b";
const DEFAULT_SKILLS = [
  {
    id: "general",
    name: "General",
    prompt: "You are Qwen, a clear and helpful local assistant. Keep answers practical, direct, and easy to follow."
  },
  {
    id: "coder",
    name: "Coder",
    prompt:
      "You are a senior coding assistant. Ask only necessary clarifying questions, explain tradeoffs briefly, and prefer concrete code, commands, and file-level guidance."
  },
  {
    id: "security-mentor",
    name: "Security mentor",
    prompt:
      "You are a responsible cybersecurity mentor. Help with legal labs, CTFs, Hack The Box, defensive learning, and high-level security concepts. Keep guidance educational and avoid helping with real-world unauthorized harm."
  }
];

const elements = {
  chatList: document.querySelector("#chatList"),
  skillList: document.querySelector("#skillList"),
  composer: document.querySelector("#composer"),
  promptInput: document.querySelector("#promptInput"),
  sendButton: document.querySelector("#sendButton"),
  messages: document.querySelector("#messages"),
  emptyState: document.querySelector("#emptyState"),
  newChatButton: document.querySelector("#newChatButton"),
  newChatWideButton: document.querySelector("#newChatWideButton"),
  connectionPill: document.querySelector("#connectionPill"),
  connectionText: document.querySelector("#connectionText"),
  settingsRailButton: document.querySelector("#settingsRailButton"),
  settingsPanel: document.querySelector("#settingsPanel"),
  hostInput: document.querySelector("#hostInput"),
  modelInput: document.querySelector("#modelInput"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  addSkillButton: document.querySelector("#addSkillButton"),
  skillPanel: document.querySelector("#skillPanel"),
  skillPanelTitle: document.querySelector("#skillPanelTitle"),
  skillNameInput: document.querySelector("#skillNameInput"),
  skillPromptInput: document.querySelector("#skillPromptInput"),
  saveSkillButton: document.querySelector("#saveSkillButton"),
  deleteSkillButton: document.querySelector("#deleteSkillButton"),
  closeSkillPanelButton: document.querySelector("#closeSkillPanelButton")
};

let settings = loadSettings();
let chats = loadChats();
let skills = loadSkills();
let activeChatId = chats[0]?.id ?? createChat().id;
let editingSkillId = null;
let isGenerating = false;

elements.hostInput.value = settings.host;
elements.modelInput.value = settings.model;

render();
checkOllama();

elements.newChatButton.addEventListener("click", startNewChat);
elements.newChatWideButton.addEventListener("click", startNewChat);

elements.settingsRailButton.addEventListener("click", () => {
  elements.settingsPanel.hidden = !elements.settingsPanel.hidden;
  elements.skillPanel.hidden = true;
});

elements.saveSettingsButton.addEventListener("click", () => {
  settings = {
    host: normalizeHost(elements.hostInput.value),
    model: elements.modelInput.value.trim() || DEFAULT_MODEL
  };
  saveSettings();
  elements.hostInput.value = settings.host;
  elements.modelInput.value = settings.model;
  elements.settingsPanel.hidden = true;
  checkOllama();
});

elements.addSkillButton.addEventListener("click", () => openSkillPanel());
elements.closeSkillPanelButton.addEventListener("click", closeSkillPanel);
elements.saveSkillButton.addEventListener("click", saveSkillFromPanel);
elements.deleteSkillButton.addEventListener("click", deleteSkillFromPanel);

elements.promptInput.addEventListener("input", () => {
  autoResizePrompt();
  elements.sendButton.disabled = elements.promptInput.value.trim().length === 0 || isGenerating;
});

elements.promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.composer.requestSubmit();
  }
});

elements.composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = elements.promptInput.value.trim();

  if (!prompt || isGenerating) {
    return;
  }

  elements.promptInput.value = "";
  autoResizePrompt();
  await sendPrompt(prompt);
});

function loadSettings() {
  const saved = safeJsonParse(localStorage.getItem("qwen-settings"));
  return {
    host: normalizeHost(saved?.host ?? DEFAULT_HOST),
    model: saved?.model?.trim() || DEFAULT_MODEL
  };
}

function saveSettings() {
  localStorage.setItem("qwen-settings", JSON.stringify(settings));
}

function loadChats() {
  const saved = safeJsonParse(localStorage.getItem("qwen-chats"));
  if (!Array.isArray(saved)) {
    return [];
  }

  return saved.map((chat) => ({
    ...chat,
    skillId: chat.skillId ?? "general"
  }));
}

function saveChats() {
  localStorage.setItem("qwen-chats", JSON.stringify(chats));
}

function createChat() {
  const chat = {
    id: crypto.randomUUID(),
    title: "New chat",
    skillId: "general",
    messages: [],
    createdAt: Date.now()
  };

  chats.unshift(chat);
  saveChats();
  return chat;
}

function startNewChat() {
  activeChatId = createChat().id;
  render();
  elements.promptInput.focus();
}

function getActiveChat() {
  return chats.find((chat) => chat.id === activeChatId) ?? chats[0];
}

function render() {
  renderChatList();
  renderSkillList();
  renderMessages();
  elements.sendButton.disabled = elements.promptInput.value.trim().length === 0 || isGenerating;
}

function renderChatList() {
  elements.chatList.innerHTML = "";

  for (const chat of chats) {
    const button = document.createElement("button");
    button.className = `chat-item${chat.id === activeChatId ? " active" : ""}`;
    button.type = "button";
    button.innerHTML = `<span>□</span><span class="chat-title"></span>`;
    button.querySelector(".chat-title").textContent = chat.title;
    button.addEventListener("click", () => {
      activeChatId = chat.id;
      render();
    });
    elements.chatList.append(button);
  }
}

function renderSkillList() {
  const chat = getActiveChat();
  elements.skillList.innerHTML = "";

  for (const skill of skills) {
    const item = document.createElement("div");
    item.className = `skill-item${chat?.skillId === skill.id ? " active" : ""}`;

    const selectButton = document.createElement("button");
    selectButton.className = "skill-item-main";
    selectButton.type = "button";
    selectButton.innerHTML = `<span>◇</span><span class="skill-title"></span>`;
    selectButton.querySelector(".skill-title").textContent = skill.name;
    selectButton.addEventListener("click", () => {
      if (!chat) {
        return;
      }

      chat.skillId = skill.id;
      saveChats();
      render();
    });

    const editButton = document.createElement("button");
    editButton.className = "skill-edit-button";
    editButton.type = "button";
    editButton.title = `Edit ${skill.name}`;
    editButton.setAttribute("aria-label", `Edit ${skill.name}`);
    editButton.textContent = "⋯";
    editButton.addEventListener("click", () => openSkillPanel(skill.id));

    item.append(selectButton, editButton);
    elements.skillList.append(item);
  }
}

function renderMessages() {
  const chat = getActiveChat();
  elements.messages.innerHTML = "";

  const hasMessages = chat?.messages.length > 0;
  elements.emptyState.hidden = hasMessages;
  elements.messages.hidden = !hasMessages;

  if (!chat) {
    return;
  }

  for (const message of chat.messages) {
    elements.messages.append(createMessageElement(message));
  }

  scrollMessagesToBottom();
}

function createMessageElement(message) {
  const wrapper = document.createElement("article");
  wrapper.className = `message ${message.role}${message.error ? " error" : ""}`;

  const role = document.createElement("div");
  role.className = "message-role";
  role.textContent = message.role === "user" ? "You" : settings.model;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = message.content;

  wrapper.append(role, bubble);
  return wrapper;
}

async function sendPrompt(prompt) {
  const chat = getActiveChat();
  const userMessage = { role: "user", content: prompt };
  const assistantMessage = { role: "assistant", content: "" };

  chat.messages.push(userMessage, assistantMessage);
  if (chat.title === "New chat") {
    chat.title = prompt.length > 42 ? `${prompt.slice(0, 42)}...` : prompt;
  }
  saveChats();
  render();

  isGenerating = true;
  elements.sendButton.disabled = true;

  try {
    await getOllamaReply(chat, assistantMessage);
  } catch (error) {
    assistantMessage.error = true;
    assistantMessage.content = `Could not reach Ollama. Make sure Ollama is running and the model "${settings.model}" is installed.\n\n${error.message}`;
  } finally {
    isGenerating = false;
    saveChats();
    render();
    checkOllama();
  }
}

async function getOllamaReply(chat, assistantMessage) {
  updateLastAssistantMessage("Thinking...");
  const skill = skills.find((item) => item.id === chat.skillId) ?? skills[0];
  const messages = chat.messages
    .filter((message) => !message.error && message.content)
    .map((message) => ({
      role: message.role,
      content: message.content
    }));

  if (skill?.prompt) {
    messages.unshift({
      role: "system",
      content: skill.prompt
    });
  }

  const data = await window.ollamaDesktop.chat({
    host: settings.host,
    model: settings.model,
    messages
  });

  assistantMessage.content = data.message?.content?.trim() || "The model returned an empty response.";
  updateLastAssistantMessage(assistantMessage.content);
}

function updateLastAssistantMessage(content) {
  const bubbles = elements.messages.querySelectorAll(".message.assistant .message-bubble");
  const lastBubble = bubbles[bubbles.length - 1];

  if (lastBubble) {
    lastBubble.textContent = content || "Thinking...";
    scrollMessagesToBottom();
  }
}

async function checkOllama() {
  try {
    const data = await window.ollamaDesktop.getTags(settings.host);
    const models = Array.isArray(data.models) ? data.models.map((model) => model.name) : [];
    const hasModel = models.some((name) => name === settings.model || name.startsWith(`${settings.model}:`));
    setConnectionState(
      hasModel ? "online" : "offline",
      hasModel ? `Connected to ${settings.model}` : `Ollama online, ${settings.model} not found`
    );
  } catch {
    setConnectionState("offline", "Ollama offline");
  }
}

function loadSkills() {
  const saved = safeJsonParse(localStorage.getItem("qwen-skills"));
  if (!Array.isArray(saved) || saved.length === 0) {
    return DEFAULT_SKILLS;
  }

  return saved.map((skill) => ({
    id: skill.id || crypto.randomUUID(),
    name: skill.name || "Untitled skill",
    prompt: skill.prompt || ""
  }));
}

function saveSkills() {
  localStorage.setItem("qwen-skills", JSON.stringify(skills));
}

function openSkillPanel(skillId = null) {
  const skill = skills.find((item) => item.id === skillId);
  editingSkillId = skill?.id ?? null;

  elements.settingsPanel.hidden = true;
  elements.skillPanel.hidden = false;
  elements.skillPanelTitle.textContent = skill ? "Edit skill" : "New skill";
  elements.skillNameInput.value = skill?.name ?? "";
  elements.skillPromptInput.value = skill?.prompt ?? "";
  elements.deleteSkillButton.hidden = !skill || skill.id === "general";
  elements.skillNameInput.focus();
}

function closeSkillPanel() {
  editingSkillId = null;
  elements.skillPanel.hidden = true;
}

function saveSkillFromPanel() {
  const name = elements.skillNameInput.value.trim();
  const prompt = elements.skillPromptInput.value.trim();

  if (!name || !prompt) {
    return;
  }

  if (editingSkillId) {
    const skill = skills.find((item) => item.id === editingSkillId);
    if (skill) {
      skill.name = name;
      skill.prompt = prompt;
    }
  } else {
    const skill = {
      id: crypto.randomUUID(),
      name,
      prompt
    };
    skills.push(skill);

    const chat = getActiveChat();
    if (chat) {
      chat.skillId = skill.id;
      saveChats();
    }
  }

  saveSkills();
  closeSkillPanel();
  render();
}

function deleteSkillFromPanel() {
  if (!editingSkillId || editingSkillId === "general") {
    return;
  }

  skills = skills.filter((skill) => skill.id !== editingSkillId);
  for (const chat of chats) {
    if (chat.skillId === editingSkillId) {
      chat.skillId = "general";
    }
  }

  saveSkills();
  saveChats();
  closeSkillPanel();
  render();
}

function setConnectionState(state, text) {
  elements.connectionPill.classList.remove("online", "offline");
  elements.connectionPill.classList.add(state);
  elements.connectionText.textContent = text;
}

function normalizeHost(host) {
  return (host || DEFAULT_HOST).trim().replace(/\/+$/, "");
}

function autoResizePrompt() {
  elements.promptInput.style.height = "auto";
  elements.promptInput.style.height = `${Math.min(elements.promptInput.scrollHeight, 180)}px`;
}

function scrollMessagesToBottom() {
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
