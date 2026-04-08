import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { copyTopicAssets, resolveTopicAssetPublicPath } from "./topic-assets.ts";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map(async (directory) => {
      await import("node:fs/promises").then(({ rm }) => rm(directory, { recursive: true, force: true }));
    })
  );
});

describe("resolveTopicAssetPublicPath", () => {
  it("maps a public topic asset URL back to the source file", () => {
    const topicsDirectory = "/repo/topics";

    expect(resolveTopicAssetPublicPath("/topics/0-demo/assets/retro-vibe.png", topicsDirectory)).toBe(
      path.join(topicsDirectory, "0-demo", "assets", "retro-vibe.png")
    );
    expect(resolveTopicAssetPublicPath("/topics/0-demo/0-intro.md", topicsDirectory)).toBeNull();
    expect(resolveTopicAssetPublicPath("/topics/0-demo/assets/../0-intro.md", topicsDirectory)).toBeNull();
  });
});

describe("copyTopicAssets", () => {
  it("copies only topic asset files into the built topics directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);

    const topicsDirectory = path.join(root, "topics");
    const outputDirectory = path.join(root, "dist");

    await mkdir(path.join(topicsDirectory, "0-demo", "assets"), { recursive: true });
    await mkdir(path.join(topicsDirectory, "0-demo", "notes"), { recursive: true });
    await writeFile(path.join(topicsDirectory, "0-demo", "assets", "retro-vibe.png"), "png-data", "utf8");
    await writeFile(path.join(topicsDirectory, "0-demo", "assets", "nested.txt"), "nested", "utf8");
    await writeFile(path.join(topicsDirectory, "0-demo", "0-intro.md"), "---\ntitle: Intro\nascii_seed: null\n---", "utf8");
    await writeFile(path.join(topicsDirectory, "0-demo", "notes", "draft.txt"), "not public", "utf8");

    const copiedFiles = await copyTopicAssets(topicsDirectory, outputDirectory);
    const copiedImage = path.join(outputDirectory, "topics", "0-demo", "assets", "retro-vibe.png");
    const copiedNestedFile = path.join(outputDirectory, "topics", "0-demo", "assets", "nested.txt");
    const copiedSlide = path.join(outputDirectory, "topics", "0-demo", "0-intro.md");

    expect(copiedFiles).toEqual([copiedNestedFile, copiedImage].sort());
    expect(await readFile(copiedImage, "utf8")).toBe("png-data");
    expect(await readFile(copiedNestedFile, "utf8")).toBe("nested");
    await expect(readFile(copiedSlide, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
