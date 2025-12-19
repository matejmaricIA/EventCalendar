const MENU_ID = "kalendar-add-to-calendar";
const storage = chrome.storage.session || chrome.storage.local;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Add to Google Calendar",
      contexts: ["selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }

  if (!tab || typeof tab.id !== "number") {
    return;
  }

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: getPageContext
    },
    (results) => {
      const fallbackContext = {
        selectionText: info.selectionText || "",
        pageTitle: "",
        headingText: "",
        url: info.pageUrl || "",
        hostname: ""
      };

      let pageContext = fallbackContext;
      if (!chrome.runtime.lastError && results && results[0] && results[0].result) {
        pageContext = { ...fallbackContext, ...results[0].result };
      }

      const payload = {
        ...pageContext,
        selectionText: info.selectionText || pageContext.selectionText || "",
        url: info.pageUrl || pageContext.url || "",
        capturedAt: new Date().toISOString()
      };

      storage.set({ lastContext: payload }, () => {
        openEditorWindow();
      });
    }
  );
});

function getPageContext() {
  const selection = window.getSelection();
  const selectionText = selection ? selection.toString() : "";
  let headingText = "";

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
    }
  }

  return {
    selectionText,
    pageTitle: document.title || "",
    headingText,
    url: location.href,
    hostname: location.hostname
  };
}

function openEditorWindow() {
  const url = chrome.runtime.getURL("popup.html");
  chrome.windows.create({
    url,
    type: "popup",
    width: 440,
    height: 720
  });
}
