import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflowPath = resolve(__dirname, "../.github/workflows/release.yml");

test("Chrome packaging passes the GitHub ref through env before shell sanitizing", () => {
  const workflow = readFileSync(workflowPath, "utf8");

  assert.match(workflow, /REF_NAME:\s+\$\{\{\s*github\.ref_name\s*\}\}/);
  assert.doesNotMatch(workflow, /ref_name="\$\{\{\s*github\.ref_name\s*\}\}"/);
});
