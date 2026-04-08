import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { renderPresentationManifestModule, writePresentationManifest } from "./presentation-manifest-file.ts";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map(async (directory) => {
      await import("node:fs/promises").then(({ rm }) => rm(directory, { recursive: true, force: true }));
    })
  );
});

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

    expect(fileContent).toContain('export const presentationManifest: PresentationManifest = {');
    expect(fileContent).toContain('"slug": "intro"');
    expect(fileContent).toContain("export default presentationManifest;");
  });
});

describe("writePresentationManifest", () => {
  it("writes a generated manifest file from Markdown topics", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);

    const topicsDirectory = path.join(root, "topics");
    const outputFile = path.join(root, "src/generated/presentation-manifest.ts");

    await mkdir(path.join(topicsDirectory, "0-demo"), { recursive: true });
    await writeFile(
      path.join(topicsDirectory, "0-demo", "0-intro.md"),
      `---
title: Intro
summary: Demo slide
ascii_seed: zero-one
---
## Scene
Hello
`,
      "utf8"
    );

    const manifest = await writePresentationManifest({ topicsDirectory, outputFile });
    const fileContent = await readFile(outputFile, "utf8");

    expect(manifest.topics).toHaveLength(1);
    expect(fileContent).toContain('export const presentationManifest: PresentationManifest = {');
    expect(fileContent).toContain('"title": "Intro"');
  });
});
