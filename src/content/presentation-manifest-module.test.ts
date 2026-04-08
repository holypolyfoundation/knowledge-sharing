import { describe, expect, it } from "vitest";

import { renderPresentationManifestModule } from "./presentation-manifest-module.ts";

describe("renderPresentationManifestModule", () => {
  it("serializes the manifest into a TypeScript module", () => {
    const fileContent = renderPresentationManifestModule({
      topics: [
        {
          id: 0,
          slug: "intro",
          title: "Intro",
          slides: []
        }
      ]
    });

    expect(fileContent).toContain("export const presentationManifest = {");
    expect(fileContent).toContain('"slug": "intro"');
    expect(fileContent).toContain("export default presentationManifest;");
  });
});
