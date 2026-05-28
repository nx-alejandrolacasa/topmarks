import { buildExtension } from "../../../scripts/build-extension.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

await buildExtension({ browser: "firefox", repoRoot });
