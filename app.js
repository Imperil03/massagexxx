const defaultConfig = {
  projectName: "Массаж xXx",
  projectSubtitle: "Мини-хаб для перехода к основным ссылкам проекта.",
  installHint: "После первого открытия страницу можно добавить на главный экран телефона.",
  links: [
    { label: "На сайт", href: "https://example.com" },
    { label: "ТГ-канал", href: "https://t.me/example_channel" },
    { label: "ТП в Телеграм", href: "https://t.me/example_support" },
    { label: "e-mail", href: "mailto:support@example.com" },
    { label: "Чат поддержки", href: "https://example.com/support" }
  ]
};

const ASSET_VERSION = "v3";
let deferredInstallPrompt = null;

const configElement = document.getElementById("hubConfig");
const projectTitleElement = document.getElementById("projectTitle");
const projectSubtitleElement = document.getElementById("projectSubtitle");
const installCopyElement = document.getElementById("installCopy");
const helperCopyElement = document.getElementById("helperCopy");
const linkListElement = document.getElementById("linkList");
const installButtonElement = document.getElementById("installButton");

init();

function init() {
  const config = readConfig();
  renderContent(config);
  syncInstallUi();
  registerInstallEvents();
  registerServiceWorker();
}

function readConfig() {
  if (!configElement) {
    return defaultConfig;
  }

  try {
    const parsedConfig = JSON.parse(configElement.textContent);
    return {
      ...defaultConfig,
      ...parsedConfig,
      links: Array.isArray(parsedConfig.links) && parsedConfig.links.length
        ? parsedConfig.links
        : defaultConfig.links
    };
  } catch (error) {
    console.warn("Не удалось прочитать конфиг хаба.", error);
    return defaultConfig;
  }
}

function renderContent(config) {
  document.title = config.projectName;

  if (projectTitleElement) {
    projectTitleElement.textContent = config.projectName;
  }

  if (projectSubtitleElement) {
    projectSubtitleElement.textContent = config.projectSubtitle;
  }

  if (helperCopyElement) {
    helperCopyElement.textContent = config.installHint;
  }

  if (!linkListElement) {
    return;
  }

  linkListElement.innerHTML = "";

  config.links.forEach((link) => {
    const listItem = document.createElement("li");
    const anchor = document.createElement("a");
    const label = document.createElement("span");
    const arrow = document.createElement("span");

    anchor.className = "hub-link";
    anchor.href = link.href;
    anchor.setAttribute("aria-label", link.label);

    if (isExternalLink(link.href)) {
      anchor.rel = "noreferrer";
    }

    label.className = "hub-link__label";
    label.textContent = link.label;

    arrow.className = "hub-link__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = ">";

    anchor.append(label, arrow);
    listItem.append(anchor);
    linkListElement.append(listItem);
  });
}

function registerInstallEvents() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    syncInstallUi();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    syncInstallUi();
  });

  if (!installButtonElement) {
    return;
  }

  installButtonElement.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      showManualInstallInstructions();
      return;
    }

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;

    if (choice.outcome === "accepted") {
      if (installCopyElement) {
        installCopyElement.textContent = "Установка подтверждена. После завершения хаб появится на главном экране.";
      }

      installButtonElement.textContent = "Ожидание установки";
    } else {
      syncInstallUi();
    }

    deferredInstallPrompt = null;
  });
}

function syncInstallUi() {
  if (isStandaloneMode()) {
    if (installButtonElement) {
      installButtonElement.hidden = true;
    }

    if (installCopyElement) {
      installCopyElement.textContent = "Хаб уже открыт в standalone-режиме.";
    }

    if (helperCopyElement) {
      helperCopyElement.textContent = "Ссылки доступны как внутри приложения, так и при обычном открытии в браузере.";
    }

    return;
  }

  if (installCopyElement) {
    installCopyElement.textContent = deferredInstallPrompt
      ? "Установка доступна. Нажмите кнопку ниже, чтобы добавить хаб на главный экран."
      : getPassiveInstallMessage();
  }

  if (installButtonElement) {
    installButtonElement.hidden = false;
    installButtonElement.textContent = getInstallButtonLabel();
  }
}

function showManualInstallInstructions() {
  if (installCopyElement) {
    installCopyElement.textContent = getManualInstallMessage();
  }
}

function getPassiveInstallMessage() {
  if (isTelegramInAppBrowser()) {
    return "Встроенный браузер Telegram обычно не показывает установку PWA. Нажмите кнопку ниже, чтобы увидеть, как открыть страницу во внешнем браузере.";
  }

  if (isIosDevice()) {
    return "На iPhone кнопка установки не системная: нажмите ниже и затем откройте «Поделиться».";
  }

  return "Если браузер разрешит установку, кнопка сработает сразу. Если нет, нажмите ниже и откройте меню браузера.";
}

function getManualInstallMessage() {
  if (isTelegramInAppBrowser()) {
    if (isIosDevice()) {
      return "В Telegram на iPhone сначала откройте меню браузера Telegram и выберите «Открыть в Safari», затем в Safari нажмите «Поделиться» -> «На экран Домой».";
    }

    return "В Telegram сначала откройте меню браузера и выберите «Open in Browser» или «Открыть в браузере», затем установите страницу из Chrome через «Добавить на экран».";
  }

  if (isIosDevice()) {
    return "На iPhone откройте меню «Поделиться» и выберите «На экран Домой».";
  }

  return "Если кнопка не появилась, откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».";
}

function getInstallButtonLabel() {
  if (deferredInstallPrompt) {
    return "Добавить на экран";
  }

  if (isTelegramInAppBrowser()) {
    return "Открыть в браузере";
  }

  return "Как установить";
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register(`./sw.js?${ASSET_VERSION}`);
    } catch (error) {
      console.warn("Не удалось зарегистрировать service worker.", error);
    }
  });
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isTelegramInAppBrowser() {
  return /telegram|tgwebview/i.test(window.navigator.userAgent);
}

function isExternalLink(href) {
  return /^https?:\/\//i.test(href);
}
