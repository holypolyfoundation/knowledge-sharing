import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateTopicsDirectory } from "../src/content/validate-topics.ts";
import { writePresentationManifest } from "../src/content/presentation-manifest-file.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const topicsDirectory = path.join(repoRoot, "topics");
const outputFile = path.join(repoRoot, "src/generated/presentation-manifest.ts");
const validateOnly = process.argv.includes("--validate-only");

if (validateOnly) {
  const manifest = await validateTopicsDirectory(topicsDirectory);
  console.log(`Validated ${manifest.topics.length} topic(s) in ${topicsDirectory}`);
  process.exit(0);
}

await writePresentationManifest({ topicsDirectory, outputFile });
console.log(`Wrote presentation manifest to ${outputFile}`);
