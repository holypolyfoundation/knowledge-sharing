import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PresentationManifest } from "./load-topics.ts";
import { validateTopicsDirectory } from "./validate-topics.ts";

export interface PresentationManifestPaths {
  topicsDirectory: string;
  outputFile: string;
}

export function renderPresentationManifestModule(manifest: PresentationManifest): string {
  return `import type { PresentationManifest } from "../content/load-topics.ts";

export const presentationManifest: PresentationManifest = ${JSON.stringify(manifest, null, 2)};

export default presentationManifest;
`;
}

export async function writePresentationManifest(paths: PresentationManifestPaths): Promise<PresentationManifest> {
  const manifest = await validateTopicsDirectory(paths.topicsDirectory);
  const fileContent = renderPresentationManifestModule(manifest);

  await mkdir(path.dirname(paths.outputFile), { recursive: true });
  await writeFile(paths.outputFile, fileContent, "utf8");

  return manifest;
}
