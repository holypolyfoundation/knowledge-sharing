/// <reference types="vite/client" />

declare module "virtual:presentation-manifest" {
  import type { PresentationManifest } from "./content/load-topics.ts";

  const presentationManifest: PresentationManifest;

  export default presentationManifest;
}
