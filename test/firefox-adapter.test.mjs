import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adapterPath = resolve(__dirname, "../packages/firefox/src/adapter.js");

function loadFirefoxAdapter({ currentTab } = {}) {
  const searchCalls = [];
  const context = {
    window: {},
    URL,
    browser: {
      bookmarks: {
        getSubTree: async () => [{ children: [] }],
        onCreated: { addListener() {} },
        onRemoved: { addListener() {} },
        onChanged: { addListener() {} },
        onMoved: { addListener() {} },
      },
      i18n: {
        getMessage: (key) => key,
        getUILanguage: () => "en",
      },
      search: {
        search: async (details) => searchCalls.push(details),
      },
      storage: {
        local: {
          get: async () => ({}),
          set: async () => {},
        },
        onChanged: { addListener() {} },
      },
      tabs: {
        create: async () => ({ id: 100 }),
        getCurrent: async () => currentTab,
      },
    },
  };

  vm.runInNewContext(readFileSync(adapterPath, "utf8"), context);
  return { adapter: context.window.TopmarksBrowserAdapter, searchCalls };
}

test("Firefox search falls back when the current tab is unavailable", async () => {
  const { adapter, searchCalls } = loadFirefoxAdapter({ currentTab: undefined });

  await assert.doesNotReject(() => adapter.search("query"));

  assert.equal(JSON.stringify(searchCalls), JSON.stringify([{ query: "query" }]));
});
