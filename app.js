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

const ASSET_VERSION = "v6";
let deferredInstallPrompt = null;

const configElement = document.getElementById("hubConfig");
const projectTitleElement = document.getElementById("projectTitle");
const projectSubtitleElement = document.getElementById("projectSubtitle");
const installTitleElement = document.getElementById("installTitle");
const installCopyElement = document.getElementById("installCopy");
const helperCopyElement = document.getElementById("helperCopy");
const linkListElement = document.getElementById("linkList");
const installButtonElement = document.getElementById("installButton");
const browserButtonElement = document.getElementById("browserButton");

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

  installButtonElement.addEventListener("click", onInstallButtonClick);

  if (browserButtonElement) {
    browserButtonElement.addEventListener("click", onBrowserButtonClick);
  }
}

function syncInstallUi() {
  if (isStandaloneMode()) {
    if (installButtonElement) {
      installButtonElement.hidden = true;
    }

    if (browserButtonElement) {
      browserButtonElement.hidden = true;
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

  if (browserButtonElement) {
    browserButtonElement.hidden = false;
    browserButtonElement.textContent = getBrowserButtonLabel();
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
  if (isIosDevice()) {
    return "Если страница открыта внутри Telegram или другого приложения, сначала нажмите «Открыть в браузере». В Safari затем используйте «Поделиться» -> «На экран Домой».";
  }

  return "Если страница открыта внутри Telegram или другого приложения, сначала нажмите «Открыть в браузере». Если вы уже в браузере, откройте меню и добавьте страницу на главный экран.";
}

function getManualInstallMessage() {
  if (isIosDevice()) {
    return "Если Safari не открылся автоматически, используйте меню текущего приложения и выберите «Open in Safari», затем в Safari нажмите «Поделиться» -> «На экран Домой».";
  }

  return "Если внешний браузер не открылся автоматически, используйте меню текущего приложения и выберите «Open in Browser», затем в браузере нажмите «Установить приложение» или «Добавить на главный экран».";
}

function getInstallButtonLabel() {
  if (deferredInstallPrompt) {
    return "Добавить на экран";
  }

  return "Как установить";
}

function getInstallPanelTitle() {
  return "Установка на экран";
}

function getHelperMessage() {
  return "Если ссылка открыта внутри Telegram, сначала перейдите во внешний браузер, а уже там добавьте страницу на главный экран.";
}

async function onInstallButtonClick() {
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
}

function onBrowserButtonClick() {
  if (installCopyElement) {
    installCopyElement.textContent = "Пробуем открыть страницу во внешнем браузере. Если переход не сработает, используйте меню текущего приложения -> «Open in Browser».";
  }

  if (isIosDevice()) {
    window.open(window.location.href, "_blank", "noopener");
    window.setTimeout(showManualInstallInstructions, 700);
    return;
  }

  window.location.href = buildAndroidIntentUrl(window.location.href);

  window.setTimeout(() => {
    if (document.visibilityState === "visible" && installCopyElement) {
      installCopyElement.textContent = getManualInstallMessage();
    }
  }, 900);
}

function buildAndroidIntentUrl(currentUrl) {
  const cleanUrl = currentUrl.replace(/^https?:\/\//i, "");
  return `intent://${cleanUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
}

function getBrowserButtonLabel() {
  if (isIosDevice()) {
    return "Открыть в Safari";
  }

  return "Открыть в браузере";
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

function isExternalLink(href) {
  return /^https?:\/\//i.test(href);
}
