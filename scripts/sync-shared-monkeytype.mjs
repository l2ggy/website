import { copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

await copyFile(
  resolve(repoRoot, "src/shared/monkeytype.js"),
  resolve(repoRoot, "public/js/shared/monkeytype.js")
);
