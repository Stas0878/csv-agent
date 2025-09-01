/*
  Mock data and utilities for MegaMind_X UI
  - i18n (RU/EN)
  - storage helpers
  - mock chunk generator (used in Terminal append button)
*/

export const LANG = {
  RU: "ru",
  EN: "en",
};

export const tDict = {
  ru: {
    appName: "MegaMind_X",
    agents: "Агенты",
    selectAgent: "Выбрать агента",
    refresh: "Обновить статусы",
    online: "онлайн",
    broken: "сломанный",
    idle: "бездействует",
    terminal: "Терминал",
    admin: "Админ",
    adminSettings: "Настройки администратора",
    history: "История",
    autoUpdate: "Автообновление",
    copy: "Копировать",
    download: "Скачать",
    save: "Сохранить",
    share: "Поделиться",
    clear: "Очистить",
    appended: "Добавлено",
    adminOnly: "Доступно только админу",
    accessLevel: "Уровень доступа",
    features: "Функции",
    manageAgents: "Управление агентами",
    forceRestart: "Принудительная перезагрузка",
    clearCache: "Очистка кеша",
    panels: "Панели",
    enableTerminal: "Включить Терминал",
    enableAdmin: "Включить Админ",
    enableHistory: "Включить Историю",
    theme: "Тема",
    language: "Язык",
    savedToHistory: "Сохранено в историю",
    loadedFromHistory: "Загружено из истории",
    nothingToShare: "Нечего отправлять",
    noHistory: "История пуста",
    logoGlow: "Свечение логотипа",
    glowSoft: "Мягкое",
    glowMedium: "Среднее",
    glowStrong: "Яркое",
    logoTooltip: "MegaMind_X — AI Control Hub",
    preview: "Предпросмотр",
    openInNewTab: "Открыть в новой вкладке",
    refreshPreview: "Обновить",
    shareLink: "Поделиться ссылкой",
    close: "Закрыть",
    stream: "Поток",
    // Admin modal labels
    layout: "Компоновка",
    swapSidebars: "Поменять местами сайдбары",
    leftSidebar: "Левый сайдбар",
    rightSidebar: "Правый сайдбар",
    collapse: "Свернуть",
    composerPosition: "Позиция строки ввода",
    above: "Сверху",
    below: "Снизу",
    previewPlacement: "Позиция предпросмотра",
    center: "По центру",
    right: "Справа",
    effects: "Эффекты",
    parallax: "Параллакс",
    parallaxIntensity: "Интенсивность",
    accentHue: "Цветовой тон (Hue)",
    featureToggles: "Функции",
    voiceInput: "Голосовой ввод",
    dragDrop: "Drag & Drop",
    counter: "Счётчик символов",
    custom: "Кастомизация",
    customButtons: "Пользовательские кнопки",
    add: "Добавить",
    label: "Метка",
    previewMode: "Режим предпросмотра",
    embedded: "Встроенный",
    fullscreen: "Полноэкранный",
  },
  en: {
    appName: "MegaMind_X",
    agents: "Agents",
    selectAgent: "Select agent",
    refresh: "Refresh statuses",
    online: "online",
    broken: "broken",
    idle: "idle",
    terminal: "Terminal",
    admin: "Admin",
    adminSettings: "Admin settings",
    history: "History",
    autoUpdate: "Auto update",
    copy: "Copy",
    download: "Download",
    save: "Save",
    share: "Share",
    clear: "Clear",
    appended: "Appended",
    adminOnly: "Admin only",
    accessLevel: "Access level",
    features: "Features",
    manageAgents: "Manage agents",
    forceRestart: "Force restart",
    clearCache: "Clear cache",
    panels: "Panels",
    enableTerminal: "Enable Terminal",
    enableAdmin: "Enable Admin",
    enableHistory: "Enable History",
    theme: "Theme",
    language: "Language",
    savedToHistory: "Saved to history",
    loadedFromHistory: "Loaded from history",
    nothingToShare: "Nothing to share",
    noHistory: "No history",
    logoGlow: "Logo glow",
    glowSoft: "Soft",
    glowMedium: "Medium",
    glowStrong: "Strong",
    logoTooltip: "MegaMind_X — AI Control Hub",
    preview: "Preview",
    openInNewTab: "Open in new tab",
    refreshPreview: "Refresh",
    shareLink: "Share link",
    close: "Close",
    stream: "Stream",
    layout: "Layout",
    swapSidebars: "Swap sidebars",
    leftSidebar: "Left sidebar",
    rightSidebar: "Right sidebar",
    collapse: "Collapse",
    composerPosition: "Composer position",
    above: "Above",
    below: "Below",
    previewPlacement: "Preview placement",
    center: "Center",
    right: "Right",
    effects: "Effects",
    parallax: "Parallax",
    parallaxIntensity: "Intensity",
    accentHue: "Accent Hue",
    featureToggles: "Feature toggles",
    voiceInput: "Voice input",
    dragDrop: "Drag & Drop",
    counter: "Counter",
    custom: "Customization",
    customButtons: "Custom buttons",
    add: "Add",
    label: "Label",
    previewMode: "Preview mode",
    embedded: "Embedded",
    fullscreen: "Fullscreen",
  },
};

export const STATUSES = ["online", "broken", "idle"];

export function generateAgents() {
  const list = Array.from({ length: 25 }).map((_, i) => {
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    return {
      id: `agent-${String(i + 1).padStart(2, "0")}`,
      name: `Agent-${String(i + 1).padStart(2, "0")}`,
      status,
      enabled: status !== "broken",
      ai: i < 4,
    };
  });
  return list;
}

export function randomizeStatuses(agents) {
  return agents.map(a => {
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    return { ...a, status };
  });
}

export function mockAppendChunk(selectedAgentId) {
  const ts = new Date().toLocaleTimeString();
  return `[#${selectedAgentId}] ${ts} :: build: component synthesized, size=${Math.floor(Math.random() * 30) + 1}KB`;
}

export const STORAGE_KEYS = {
  theme: "mmx_theme",
  lang: "mmx_lang",
  agents: "mmx_agents",
  selectedAgent: "mmx_selected_agent",
  terminal: "mmx_terminal",
  history: "mmx_history",
  panels: "mmx_panels",
  adminLevel: "mmx_admin_level",
  logoGlow: "mmx_logo_glow",
  leftOpen: "mmx_left_open",
  rightOpen: "mmx_right_open",
  previewMode: "mmx_preview_mode", // 'embedded' | 'fullscreen'
  uiConfig: "mmx_ui_config", // admin UI options
};

export function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}