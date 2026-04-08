import type { PresentationManifest } from "./load-topics.ts";

export function renderPresentationManifestModule(manifest: PresentationManifest): string {
  return `export const presentationManifest = ${JSON.stringify(manifest, null, 2)};

export default presentationManifest;
`;
}
