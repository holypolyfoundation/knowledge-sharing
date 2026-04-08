import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateTopicsDirectory } from "../src/content/validate-topics.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const topicsDirectory = path.join(repoRoot, "topics");
const outputFile = path.join(repoRoot, "src/generated/presentation-manifest.ts");
const validateOnly = process.argv.includes("--validate-only");

const manifest = await validateTopicsDirectory(topicsDirectory);

if (validateOnly) {
  console.log(`Validated ${manifest.topics.length} topic(s) in ${topicsDirectory}`);
  process.exit(0);
}

await mkdir(path.dirname(outputFile), { recursive: true });

const fileContent = `import type { PresentationManifest } from "../content/load-topics.ts";

export const presentationManifest: PresentationManifest = ${JSON.stringify(manifest, null, 2)};

export default presentationManifest;
`;

await writeFile(outputFile, fileContent, "utf8");
console.log(`Wrote presentation manifest to ${outputFile}`);
