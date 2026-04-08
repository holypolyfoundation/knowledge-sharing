import type { PresentationManifest } from "./load-topics.ts";
import { buildPresentationManifest } from "./load-topics.ts";

export async function validateTopicsDirectory(topicsDirectory: string): Promise<PresentationManifest> {
  return buildPresentationManifest(topicsDirectory);
}
