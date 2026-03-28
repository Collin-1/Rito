(function initRitoOptions(globalScope) {
  const root = globalScope || globalThis;
  const STORAGE_KEY = root.Rito.STORAGE_KEYS.SETTINGS;
  const defaults = root.Rito.DEFAULT_SETTINGS;

  const form = root.document.getElementById("settingsForm");
  const saveStatus = root.document.getElementById("saveStatus");
  const listContainer = root.document.getElementById("customCommandsList");
  const addShortcutBtn = root.document.getElementById("addShortcutBtn");
  const resetBtn = root.document.getElementById("resetBtn");

  const languageEl = root.document.getElementById("commandLanguage");
  const sensitivityEl = root.document.getElementById("microphoneSensitivity");
  const sensitivityValueEl = root.document.getElementById(
    "microphoneSensitivityValue",
  );
  const continuousListeningEl = root.document.getElementById(
    "continuousListening",
  );
  const hotwordEl = root.document.getElementById("hotword");
  const highContrastEl = root.document.getElementById("highContrast");
  const debugModeEl = root.document.getElementById("debugMode");
  const commandCooldownMsEl = root.document.getElementById("commandCooldownMs");

  function setSaveStatus(message, durationMs) {
    saveStatus.textContent = message;
    if (!durationMs) {
      return;
    }
    clearTimeout(setSaveStatus.timer);
    setSaveStatus.timer = setTimeout(() => {
      saveStatus.textContent = "";
    }, durationMs);
  }

  function renderCustomCommands(customCommands) {
    listContainer.innerHTML = "";
    (customCommands || []).forEach((entry) => {
      listContainer.appendChild(createRow(entry.phrase, entry.command));
    });

    if (!customCommands || !customCommands.length) {
      listContainer.appendChild(createRow("", ""));
    }
  }

  function createRow(phrase, command) {
    const row = root.document.createElement("div");
    row.className = "command-row";

    const phraseInput = root.document.createElement("input");
    phraseInput.type = "text";
    phraseInput.placeholder = "Spoken phrase";
    phraseInput.value = phrase || "";
    phraseInput.dataset.role = "phrase";

    const commandInput = root.document.createElement("input");
    commandInput.type = "text";
    commandInput.placeholder = "Mapped command";
    commandInput.value = command || "";
    commandInput.dataset.role = "command";

    const removeButton = root.document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost-btn";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      row.remove();
      if (!listContainer.children.length) {
        listContainer.appendChild(createRow("", ""));
      }
    });

    row.appendChild(phraseInput);
    row.appendChild(commandInput);
    row.appendChild(removeButton);

    return row;
  }

  function readCustomCommands() {
    const rows = Array.from(listContainer.querySelectorAll(".command-row"));
    return rows
      .map((row) => {
        const phrase = row.querySelector("[data-role='phrase']").value.trim();
        const command = row.querySelector("[data-role='command']").value.trim();
        return { phrase, command };
      })
      .filter((entry) => entry.phrase && entry.command);
  }

  function applyToForm(settings) {
    const merged = Object.assign({}, defaults, settings || {});
    languageEl.value = merged.commandLanguage;
    sensitivityEl.value = String(merged.microphoneSensitivity);
    sensitivityValueEl.textContent = String(merged.microphoneSensitivity);
    continuousListeningEl.checked = Boolean(merged.continuousListening);
    hotwordEl.value = merged.hotword || "";
    highContrastEl.checked = Boolean(merged.highContrast);
    debugModeEl.checked = Boolean(merged.debugMode);
    commandCooldownMsEl.value = String(merged.commandCooldownMs);
    renderCustomCommands(merged.customCommands || []);
  }

  async function loadSettings() {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    applyToForm(result[STORAGE_KEY]);
  }

  async function saveSettings(event) {
    event.preventDefault();

    const payload = {
      commandLanguage: languageEl.value,
      microphoneSensitivity: Number(sensitivityEl.value),
      continuousListening: continuousListeningEl.checked,
      hotword: hotwordEl.value.trim(),
      highContrast: highContrastEl.checked,
      debugMode: debugModeEl.checked,
      commandCooldownMs: Number(commandCooldownMsEl.value),
      customCommands: readCustomCommands(),
    };

    const current = await chrome.storage.sync.get(STORAGE_KEY);
    const merged = Object.assign(
      {},
      defaults,
      current[STORAGE_KEY] || {},
      payload,
    );
    await chrome.storage.sync.set({ [STORAGE_KEY]: merged });

    try {
      await chrome.runtime.sendMessage({
        type: root.Rito.MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: merged,
      });
    } catch (_error) {
      // The storage update still succeeds even if worker is asleep.
    }

    setSaveStatus("Settings saved", 1600);
  }

  function wireEvents() {
    form.addEventListener("submit", saveSettings);

    sensitivityEl.addEventListener("input", () => {
      sensitivityValueEl.textContent = String(
        Number(sensitivityEl.value).toFixed(2),
      );
    });

    addShortcutBtn.addEventListener("click", () => {
      listContainer.appendChild(createRow("", ""));
    });

    resetBtn.addEventListener("click", () => {
      applyToForm(defaults);
      setSaveStatus("Defaults loaded. Save to apply.", 1800);
    });
  }

  wireEvents();
  loadSettings().catch(() => {
    applyToForm(defaults);
    setSaveStatus("Unable to load settings. Defaults shown.", 1800);
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
