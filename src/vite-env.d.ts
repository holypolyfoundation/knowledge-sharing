/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** True when code runs under Vitest (no tab-title spinner timers in tests). */
  readonly VITEST?: boolean;
}

declare module "virtual:presentation-manifest" {
  import type { PresentationManifest } from "./content/load-topics.ts";

  const presentationManifest: PresentationManifest;

  export default presentationManifest;
}
