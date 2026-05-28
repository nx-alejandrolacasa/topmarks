import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = resolve(__dirname, "../packages/shared/src/app.js");

class TestElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.textContent = "";
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  addEventListener() {}
}

function loadCreateBookmarkLink() {
  const source = readFileSync(appPath, "utf8");
  const prefix = source.slice(0, source.indexOf("\nfunction createDropdownEntry"));
  const context = {
    document: {
      createElement: (tagName) => new TestElement(tagName),
      createElementNS: (_namespace, tagName) => new TestElement(tagName),
    },
    window: {
      matchMedia: () => ({
        addEventListener() {},
        matches: false,
      }),
      TOPMARKS_CONFIG: {},
      TopmarksBrowserAdapter: {
        faviconSources: () => ["favicon.ico"],
        utmSource: "topmarks-test",
      },
    },
  };

  vm.runInNewContext(
    `${prefix}\nglobalThis.__createBookmarkLink = createBookmarkLink;`,
    context,
  );

  return context.__createBookmarkLink;
}

test("untitled bookmarks render a favicon without visible URL text", () => {
  const createBookmarkLink = loadCreateBookmarkLink();

  const link = createBookmarkLink({
    title: "",
    url: "https://example.com/path",
  });

  const label = link.children.find((child) => child.className === "bookmark-title");
  assert.equal(label?.textContent || "", "");
});

test("untitled bookmarks omit the empty title node so the favicon stays centered", () => {
  const createBookmarkLink = loadCreateBookmarkLink();

  const link = createBookmarkLink({
    title: "",
    url: "https://example.com/path",
  });

  assert.equal(
    link.children.some((child) => child.className === "bookmark-title"),
    false,
  );
});
