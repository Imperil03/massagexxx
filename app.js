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

const ASSET_VERSION = "v5";
let deferredInstallPrompt = null;

const configElement = document.getElementById("hubConfig");
const projectTitleElement = document.getElementById("projectTitle");
const projectSubtitleElement = document.getElementById("projectSubtitle");
const installTitleElement = document.getElementById("installTitle");
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
      if (openPageOutsideTelegram()) {
        return;
      }

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

     if (installTitleElement) {
      installTitleElement.textContent = "Установка на экран";
    }

    if (installCopyElement) {
      installCopyElement.textContent = "Хаб уже открыт в standalone-режиме.";
    }

    if (helperCopyElement) {
      helperCopyElement.textContent = "Ссылки доступны как внутри приложения, так и при обычном открытии в браузере.";
    }

    return;
  }

  if (installTitleElement) {
    installTitleElement.textContent = getInstallPanelTitle();
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

  if (helperCopyElement) {
    helperCopyElement.textContent = getHelperMessage();
  }
}

function showManualInstallInstructions() {
  if (installCopyElement) {
    installCopyElement.textContent = getManualInstallMessage();
  }
}

function getPassiveInstallMessage() {
  if (isTelegramInAppBrowser()) {
    if (isAndroidDevice()) {
      return "Встроенный браузер Telegram не устанавливает PWA напрямую. Нажмите кнопку ниже, чтобы открыть страницу во внешнем браузере, а затем установить ее уже там.";
    }

    return "Встроенный браузер Telegram не устанавливает PWA напрямую. Нажмите кнопку ниже, затем откройте страницу в Safari и добавьте ее на экран Домой.";
  }

  if (isIosDevice()) {
    return "На iPhone кнопка установки не системная: нажмите ниже и затем откройте «Поделиться».";
  }

  return "Если браузер разрешит установку, кнопка сработает сразу. Если нет, нажмите ниже и откройте меню браузера.";
}

function getManualInstallMessage() {
  if (isTelegramInAppBrowser()) {
    if (isAndroidDevice()) {
      return "Если внешний браузер не открылся автоматически, нажмите в Telegram меню ⋮ и выберите «Open in Browser», затем в браузере нажмите «Добавить на экран».";
    }

    if (isIosDevice()) {
      return "Если Safari не открылся автоматически, нажмите в Telegram меню и выберите «Open in Safari», затем в Safari нажмите «Поделиться» -> «На экран Домой».";
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

  if (isTelegramInAppBrowser() && isAndroidDevice()) {
    return "Открыть в браузере";
  }

  if (isTelegramInAppBrowser() && isIosDevice()) {
    return "Открыть в Safari";
  }

  return "Как установить";
}

function getInstallPanelTitle() {
  if (isTelegramInAppBrowser()) {
    return "Открыть для установки";
  }

  return "Установка на экран";
}

function getHelperMessage() {
  if (isTelegramInAppBrowser()) {
    return "После открытия во внешнем браузере страницу можно будет добавить на главный экран телефона.";
  }

  return "После установки хаб будет открываться как отдельное мини-приложение.";
}

function openPageOutsideTelegram() {
  if (!isTelegramInAppBrowser()) {
    return false;
  }

  if (isAndroidDevice()) {
    if (installCopyElement) {
      installCopyElement.textContent = "Пробуем открыть страницу во внешнем браузере. Если переход не сработает, используйте в Telegram меню ⋮ -> «Open in Browser».";
    }

    window.location.href = buildAndroidIntentUrl(window.location.href);

    window.setTimeout(() => {
      if (document.visibilityState === "visible" && installCopyElement) {
        installCopyElement.textContent = getManualInstallMessage();
      }
    }, 900);

    return true;
  }

  if (isIosDevice()) {
    showManualInstallInstructions();
    return true;
  }

  return false;
}

function buildAndroidIntentUrl(currentUrl) {
  const cleanUrl = currentUrl.replace(/^https?:\/\//i, "");
  return `intent://${cleanUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
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

function isAndroidDevice() {
  return /android/i.test(window.navigator.userAgent);
}

function isTelegramInAppBrowser() {
  return /telegram|tgwebview/i.test(window.navigator.userAgent);
}

function isExternalLink(href) {
  return /^https?:\/\//i.test(href);
}
