import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateTopicsDirectory } from "../src/content/validate-topics.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const topicsDirectory = path.join(repoRoot, "topics");
const manifest = await validateTopicsDirectory(topicsDirectory);
console.log(`Validated ${manifest.topics.length} topic(s) in ${topicsDirectory}`);
