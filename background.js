const MENU_ID = "kalendar-add-to-calendar";
const DEFAULT_LANGUAGE = "hr";
const MENU_TITLES = {
  hr: "Dodaj u Google Kalendar",
  en: "Add to Google Calendar"
};
const sessionStorage = chrome.storage.session || chrome.storage.local;
const settingsStorage = chrome.storage.local;

chrome.runtime.onInstalled.addListener(() => {
  loadLanguage((language) => {
    setContextMenuLanguage(language);
  });
});

chrome.runtime.onStartup.addListener(() => {
  loadLanguage((language) => {
    setContextMenuLanguage(language);
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.language) {
    return;
  }
  setContextMenuLanguage(changes.language.newValue || DEFAULT_LANGUAGE);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }

  if (!tab || typeof tab.id !== "number") {
    return;
  }

  const fallbackUrl = info.pageUrl || (tab && tab.url) || "";
  const fallbackTitle = tab && tab.title ? tab.title : "";
  const fallbackHostname = safeHostname(fallbackUrl);

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: getPageContext
    },
    (results) => {
      const fallbackContext = {
        selectionText: info.selectionText || "",
        pageTitle: fallbackTitle,
        headingText: "",
        durationHint: "",
        url: fallbackUrl,
        hostname: fallbackHostname
      };

      let pageContext = fallbackContext;
      if (!chrome.runtime.lastError && results && results[0] && results[0].result) {
        pageContext = { ...fallbackContext, ...results[0].result };
      }
      pageContext.pageTitle = pageContext.pageTitle || fallbackTitle;
      pageContext.url = pageContext.url || fallbackUrl;
      pageContext.hostname = pageContext.hostname || fallbackHostname;

      const payload = {
        ...pageContext,
        selectionText: info.selectionText || pageContext.selectionText || "",
        url: pageContext.url || fallbackUrl || "",
        capturedAt: new Date().toISOString()
      };

      sessionStorage.set({ lastContext: payload }, () => {
        openEditorWindow();
      });
    }
  );
});

function getPageContext() {
  const selection = window.getSelection();
  const selectionText = selection ? selection.toString() : "";
  let headingText = "";
  let durationHint = "";

  if (selection && selection.rangeCount > 0) {
    let node = selection.getRangeAt(0).commonAncestorContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }

    const container = node && node.closest ? node.closest("article, section, main, body") : document.body;
    if (container) {
      const heading = container.querySelector("h1, h2, h3");
      if (heading && heading.textContent) {
        headingText = heading.textContent.trim();
      }
      durationHint = extractDurationHint(container);
    }
  }

  return {
    selectionText,
    pageTitle: document.title || "",
    headingText,
    durationHint,
    url: location.href,
    hostname: location.hostname
  };
}

function extractDurationHint(container) {
  if (!container) {
    return "";
  }

  const rawText = container.innerText || container.textContent || "";
  if (!rawText) {
    return "";
  }

  const clipped = rawText.length > 8000 ? rawText.slice(0, 8000) : rawText;
  const lines = clipped.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const durationRegex = /(\d{1,3}\s*(?:min|minute|minutes|minuta|sat|sati|h|hr|hrs|hour|hours)\b|\d{1,3}\s*(?:'|\u2032|\u2019|\u00b4))/i;
  const matches = [];

  for (const line of lines) {
    if (durationRegex.test(line)) {
      matches.push(line);
    }
    if (matches.length >= 6) {
      break;
    }
  }

  return matches.join(" | ");
}

function openEditorWindow() {
  const url = chrome.runtime.getURL("popup.html");
  chrome.windows.create({
    url,
    type: "popup",
    width: 540,
    height: 760
  });
}

function safeHostname(url) {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).hostname;
  } catch (error) {
    return "";
  }
}

function loadLanguage(callback) {
  settingsStorage.get(["language"], (result) => {
    callback(result.language || DEFAULT_LANGUAGE);
  });
}

function setContextMenuLanguage(language) {
  const title = MENU_TITLES[language] || MENU_TITLES[DEFAULT_LANGUAGE];
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title,
      contexts: ["selection"]
    });
  });
}
