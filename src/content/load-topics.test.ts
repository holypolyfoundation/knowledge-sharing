import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildPresentationManifest } from "./load-topics.ts";

const tempDirectories: string[] = [];

function buildSlide(title: string, summary: string, body: string): string {
  return `---
title: ${title}
summary: ${summary}
ascii_seed: zero-one
---
${body}
`;
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map(async (directory) => {
      await import("node:fs/promises").then(({ rm }) => rm(directory, { recursive: true, force: true }));
    })
  );
});

describe("buildPresentationManifest", () => {
  it("sorts topics and slides numerically", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "10-later"));
    await mkdir(path.join(root, "2-earlier"));
    await writeFile(
      path.join(root, "2-earlier", "8-wrap-up.md"),
      buildSlide("Wrap Up", "Last slide", "## Final\nThanks"),
      "utf8"
    );
    await writeFile(
      path.join(root, "2-earlier", "3-start.md"),
      buildSlide("Start", "First slide", "## Kickoff\nWe begin"),
      "utf8"
    );
    await writeFile(
      path.join(root, "10-later", "0-intro.md"),
      buildSlide("Later", "Another topic", "## Context\nFuture topic"),
      "utf8"
    );

    const manifest = await buildPresentationManifest(root);

    expect(manifest.topics.map((topic) => topic.id)).toEqual([2, 10]);
    expect(manifest.topics[0].slides.map((slide) => slide.id)).toEqual([3, 8]);
    expect(manifest.topics[0].title).toBe("Earlier");
    expect(manifest.topics[0].slides[0].asciiSeed).toBe("zero-one");
  });

  it("rejects duplicate slide ids inside one topic", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "0-demo"));
    await writeFile(path.join(root, "0-demo", "0-intro.md"), buildSlide("One", "First", "## Scene\nAlpha"), "utf8");
    await writeFile(path.join(root, "0-demo", "0-second.md"), buildSlide("Two", "Second", "## Scene\nBeta"), "utf8");

    await expect(buildPresentationManifest(root)).rejects.toThrow('duplicate slide id "0"');
  });

  it("preserves compiled HTML", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "0-demo"));
    await writeFile(
      path.join(root, "0-demo", "0-intro.md"),
      buildSlide(
        "Intro",
        "Compiled body",
        `## Flow
\`\`\`mermaid
graph TD
  A --> B
\`\`\``
      ),
      "utf8"
    );

    const manifest = await buildPresentationManifest(root);

    expect(manifest.topics[0].slides[0].html).toContain('class="mermaid"');
    expect(manifest.topics[0].slides[0].hasMermaid).toBe(true);
  });

  it("preserves null asciiSeed values", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "0-demo"));
    await writeFile(
      path.join(root, "0-demo", "0-intro.md"),
      `---
title: Intro
summary: No animation
ascii_seed: null
---
## Scene
Plain content
`,
      "utf8"
    );

    const manifest = await buildPresentationManifest(root);

    expect(manifest.topics[0].slides[0].asciiSeed).toBeNull();
  });
});
