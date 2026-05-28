(function () {
  const TOOLBAR_ID = "toolbar_____";

  function faviconSources(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return [];
      return [`page-icon:${url}`, `${u.origin}/favicon.ico`];
    } catch {
      return [];
    }
  }

  async function getToolbarBookmarks() {
    const [toolbar] = await browser.bookmarks.getSubTree(TOOLBAR_ID);
    return toolbar.children || [];
  }

  async function search(query, { newTab = false } = {}) {
    if (newTab) {
      const tab = await browser.tabs.create({ url: "about:blank", active: true });
      await browser.search.search({ query, tabId: tab.id });
      return;
    }
    const current = await browser.tabs.getCurrent();
    await browser.search.search({ query, tabId: current.id });
  }

  window.TopmarksBrowserAdapter = {
    getMessage(key) {
      return browser.i18n.getMessage(key);
    },
    getUILanguage() {
      return browser.i18n.getUILanguage();
    },
    storageGet(keysOrDefaults) {
      return browser.storage.local.get(keysOrDefaults);
    },
    storageSet(values) {
      return browser.storage.local.set(values);
    },
    onStorageChanged(listener) {
      browser.storage.onChanged.addListener(listener);
    },
    getToolbarBookmarks,
    onBookmarksChanged(listener) {
      const events = ["onCreated", "onRemoved", "onChanged", "onMoved"];
      for (const eventName of events) {
        const event = browser.bookmarks[eventName];
        if (event) event.addListener(listener);
      }
    },
    search,
    faviconSources,
  };
})();
