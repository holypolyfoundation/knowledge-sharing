import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildPresentationManifest } from "./load-topics.ts";

const tempDirectories: string[] = [];

function buildSlide(title: string, summary: string | null, body: string, asciiHeight?: number): string {
  return [
    "---",
    `title: ${title}`,
    summary === null ? null : `summary: ${summary}`,
    "ascii_seed: zero-one",
    asciiHeight === undefined ? null : `ascii_height: ${asciiHeight}`,
    "---",
    body,
    ""
  ]
    .filter((line) => line !== null)
    .join("\n");
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
    expect(manifest.topics[0].slides[0].asciiHeight).toBe(3);
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

  it("exposes explicit asciiHeight values in the manifest", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "0-demo"));
    await writeFile(
      path.join(root, "0-demo", "0-intro.md"),
      buildSlide("Intro", "Tall animation", "## Flow\nScaled output", 10),
      "utf8"
    );

    const manifest = await buildPresentationManifest(root);

    expect(manifest.topics[0].slides[0].asciiHeight).toBe(10);
  });

  it("adds syntax highlighting markup for supported code fences", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "0-demo"));
    await writeFile(
      path.join(root, "0-demo", "0-intro.md"),
      buildSlide(
        "Intro",
        "Highlighted code",
        `## Example
\`\`\`js
const total = values.reduce((sum, value) => sum + value, 0);
\`\`\``
      ),
      "utf8"
    );

    const manifest = await buildPresentationManifest(root);

    expect(manifest.topics[0].slides[0].html).toContain('<pre class="hljs">');
    expect(manifest.topics[0].slides[0].html).toContain('class="hljs language-js"');
    expect(manifest.topics[0].slides[0].html).toContain('class="hljs-keyword"');
  });

  it("marks markdown-like fences for auto-wrapping", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "0-demo"));
    await writeFile(
      path.join(root, "0-demo", "0-intro.md"),
      buildSlide(
        "Intro",
        "Wrapped text block",
        `## Example
\`\`\`md
Згенеруй мінімальну монорепу «майже X»: API Gateway, Auth → Profile, Social graph → Profile
\`\`\``
      ),
      "utf8"
    );

    const manifest = await buildPresentationManifest(root);

    expect(manifest.topics[0].slides[0].html).toContain('class="code-block-wrap hljs"');
    expect(manifest.topics[0].slides[0].html).toContain('class="hljs language-md"');
  });

  it("rewrites topic-local image paths in slide HTML", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "0-demo"));
    await writeFile(
      path.join(root, "0-demo", "0-intro.md"),
      buildSlide(
        "Intro",
        "Local image",
        `## Scene
![Retro vibe](./assets/retro-vibe.png "Neon grid")

![Console shot](assets/terminal.png)`
      ),
      "utf8"
    );

    const manifest = await buildPresentationManifest(root);
    const html = manifest.topics[0].slides[0].html;

    expect(html).toContain('src="topics/0-demo/assets/retro-vibe.png"');
    expect(html).toContain('alt="Retro vibe"');
    expect(html).toContain('title="Neon grid"');
    expect(html).toContain('src="topics/0-demo/assets/terminal.png"');
    expect(html).toContain('alt="Console shot"');
  });

  it("rewrites topic-local src in raw img tags", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "0-demo"));
    await writeFile(
      path.join(root, "0-demo", "0-intro.md"),
      buildSlide(
        "Intro",
        "Raw img",
        `## Scene
<img src="./assets/photo.png" alt="Photo" style="max-width: 400px" />`
      ),
      "utf8"
    );

    const manifest = await buildPresentationManifest(root);
    const html = manifest.topics[0].slides[0].html;

    expect(html).toContain('src="topics/0-demo/assets/photo.png"');
    expect(html).toContain('alt="Photo"');
    expect(html).toContain('max-width: 400px');
  });

  it("leaves external and rooted image paths unchanged", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "0-demo"));
    await writeFile(
      path.join(root, "0-demo", "0-intro.md"),
      buildSlide(
        "Intro",
        "Remote image",
        `## Scene
![External](https://example.com/retro.png)
![Rooted](/shared/retro.png)
![Hash](#diagram)`
      ),
      "utf8"
    );

    const manifest = await buildPresentationManifest(root);
    const html = manifest.topics[0].slides[0].html;

    expect(html).toContain('src="https://example.com/retro.png"');
    expect(html).toContain('src="/shared/retro.png"');
    expect(html).toContain('src="#diagram"');
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
    expect(manifest.topics[0].slides[0].asciiHeight).toBe(3);
  });

  it("defaults missing summary to an empty string", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    await mkdir(path.join(root, "0-demo"));
    await writeFile(
      path.join(root, "0-demo", "0-intro.md"),
      buildSlide("Intro", null, "## Scene\nPlain content"),
      "utf8"
    );

    const manifest = await buildPresentationManifest(root);

    expect(manifest.topics[0].slides[0].summary).toBe("");
  });
});
