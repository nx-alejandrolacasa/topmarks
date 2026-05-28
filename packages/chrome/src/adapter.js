(function () {
  function promisify(fn, thisArg, ...args) {
    return new Promise((resolve, reject) => {
      fn.call(thisArg, ...args, (result) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(result);
      });
    });
  }

  function faviconSources(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return [];
      const internal = new URL(chrome.runtime.getURL("/_favicon/"));
      internal.searchParams.set("pageUrl", url);
      internal.searchParams.set("size", "32");
      return [internal.toString(), `${u.origin}/favicon.ico`];
    } catch {
      return [];
    }
  }

  async function storageGet(keysOrDefaults) {
    if (chrome.storage.local.get.length === 1) {
      return chrome.storage.local.get(keysOrDefaults);
    }
    return promisify(chrome.storage.local.get, chrome.storage.local, keysOrDefaults);
  }

  async function storageSet(values) {
    if (chrome.storage.local.set.length === 1) {
      return chrome.storage.local.set(values);
    }
    return promisify(chrome.storage.local.set, chrome.storage.local, values);
  }

  async function getToolbarBookmarks() {
    const tree = chrome.bookmarks.getTree.length === 0
      ? await chrome.bookmarks.getTree()
      : await promisify(chrome.bookmarks.getTree, chrome.bookmarks);
    const root = tree[0];
    const children = root?.children || [];
    const bar =
      children.find((node) => node.id === "1") ||
      children.find((node) => /bookmarks bar/i.test(node.title || "")) ||
      children[0];
    return bar?.children || [];
  }

  async function search(query, { newTab = false } = {}) {
    if (!chrome.search?.query) {
      throw new Error("chrome.search.query is unavailable");
    }
    const details = {
      text: query,
      disposition: newTab ? "NEW_TAB" : "CURRENT_TAB",
    };
    if (chrome.search.query.length === 1) {
      await chrome.search.query(details);
      return;
    }
    await promisify(chrome.search.query, chrome.search, details);
  }

  window.TopmarksBrowserAdapter = {
    getMessage(key) {
      return chrome.i18n.getMessage(key);
    },
    getUILanguage() {
      return chrome.i18n.getUILanguage();
    },
    storageGet,
    storageSet,
    onStorageChanged(listener) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local") listener(changes);
      });
    },
    getToolbarBookmarks,
    onBookmarksChanged(listener) {
      const events = ["onCreated", "onRemoved", "onChanged", "onMoved"];
      for (const eventName of events) {
        const event = chrome.bookmarks[eventName];
        if (event) event.addListener(listener);
      }
    },
    search,
    faviconSources,
    utmSource: "topmarks-chrome",
  };
})();
