import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseAsciiScenarioInput, updateSlideAsciiSeed } from "./seed-generator.ts";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map(async (directory) => {
      await import("node:fs/promises").then(({ rm }) => rm(directory, { recursive: true, force: true }));
    })
  );
});

describe("parseAsciiScenarioInput", () => {
  it("returns null for explicit no-animation requests", () => {
    expect(parseAsciiScenarioInput("null")).toBeNull();
    expect(parseAsciiScenarioInput("none")).toBeNull();
  });

  it("accepts the supported scenario keys and rejects others", () => {
    expect(parseAsciiScenarioInput("zero-one")).toBe("zero-one");
    expect(parseAsciiScenarioInput("fire")).toBe("fire");
    expect(parseAsciiScenarioInput("radar")).toBe("radar");
    expect(parseAsciiScenarioInput("starfield")).toBe("starfield");
    expect(parseAsciiScenarioInput("circuit-pulse")).toBe("circuit-pulse");
    expect(parseAsciiScenarioInput("equalizer")).toBe("equalizer");
    expect(parseAsciiScenarioInput("packet-flow")).toBe("packet-flow");
    expect(parseAsciiScenarioInput("tide")).toBe("tide");
    expect(parseAsciiScenarioInput("hourglass")).toBe("hourglass");
    expect(parseAsciiScenarioInput("forge")).toBe("forge");
    expect(parseAsciiScenarioInput("swarm")).toBe("swarm");
    expect(parseAsciiScenarioInput("glitch-banner")).toBe("glitch-banner");
    expect(parseAsciiScenarioInput("terminal")).toBe("terminal");
    expect(parseAsciiScenarioInput("game-of-life")).toBe("game-of-life");
    expect(() => parseAsciiScenarioInput("volcano")).toThrow(
      'Invalid ascii scenario "volcano". Expected one of zero-one, fire, radar, starfield, circuit-pulse, equalizer, packet-flow, tide, hourglass, forge, swarm, glitch-banner, terminal, game-of-life, null, or none.'
    );
  });
});

describe("updateSlideAsciiSeed", () => {
  it("writes ascii_seed and strips legacy inline blocks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    const slidePath = path.join(root, "0-intro.md");
    await writeFile(
      slidePath,
      `---
title: Intro
summary: Opening frame
ascii_prompt: old prompt
---
<div align="center" data-slide-ascii><pre>x</pre></div>

## Scene
Shared context
`,
      "utf8"
    );

    const expression = await updateSlideAsciiSeed(slidePath, "zero-one");
    const nextContent = await readFile(slidePath, "utf8");

    expect(expression).toBe("zero-one");
    expect(nextContent).toContain('ascii_seed: "zero-one"');
    expect(nextContent).not.toContain("ascii_prompt:");
    expect(nextContent).not.toContain("data-slide-ascii");
  });

  it("preserves existing ascii_height and keeps it ordered after ascii_seed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    const slidePath = path.join(root, "0-intro.md");
    await writeFile(
      slidePath,
      `---
title: Intro
summary: Opening frame
ascii_height: 10
---
## Scene
Shared context
`,
      "utf8"
    );

    await updateSlideAsciiSeed(slidePath, "fire");
    const nextContent = await readFile(slidePath, "utf8");

    expect(nextContent).toContain('ascii_seed: "fire"\nascii_height: 10');
  });

  it("allows null ascii_seed updates", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "knowledge-sharing-"));
    tempDirectories.push(root);
    const slidePath = path.join(root, "0-intro.md");
    await writeFile(
      slidePath,
      `---
title: Intro
summary: Opening frame
---
## Scene
Shared context
`,
      "utf8"
    );

    await updateSlideAsciiSeed(slidePath, "null");
    const nextContent = await readFile(slidePath, "utf8");

    expect(nextContent).toContain("ascii_seed: null");
  });
});
