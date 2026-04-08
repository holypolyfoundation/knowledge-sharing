import { describe, expect, it } from "vitest";

import { parseSlideMarkdown } from "./slide-schema.ts";

function buildValidSlide(body = ""): string {
  return `---
title: Intro
summary: Opening frame
ascii_seed: zero-one
---

## Scene
Shared context

${body}`;
}

describe("parseSlideMarkdown", () => {
  it("accepts a valid slide with ascii_seed and mermaid", () => {
    const parsed = parseSlideMarkdown(
      buildValidSlide(`## Flow
\`\`\`mermaid
graph LR
  A[Idea] --> B[Slide]
\`\`\``),
      "/tmp/0-intro.md"
    );

    expect(parsed.frontmatter.title).toBe("Intro");
    expect(parsed.frontmatter.ascii_seed).toBe("zero-one");
    expect(parsed.frontmatter.ascii_height).toBe(3);
    expect(parsed.sections).toEqual(["Scene", "Flow"]);
    expect(parsed.hasMermaid).toBe(true);
  });

  it("accepts null ascii_seed", () => {
    const parsed = parseSlideMarkdown(
      buildValidSlide().replace(
        "ascii_seed: zero-one",
        "ascii_seed: null"
      ),
      "/tmp/0-intro.md"
    );

    expect(parsed.frontmatter.ascii_seed).toBeNull();
    expect(parsed.frontmatter.ascii_height).toBe(3);
  });

  it("accepts explicit ascii_height", () => {
    const parsed = parseSlideMarkdown(
      buildValidSlide().replace(
        "ascii_seed: zero-one",
        "ascii_seed: zero-one\nascii_height: 10"
      ),
      "/tmp/0-intro.md"
    );

    expect(parsed.frontmatter.ascii_height).toBe(10);
  });

  it("accepts ascii_height when ascii_seed is null", () => {
    const parsed = parseSlideMarkdown(
      buildValidSlide().replace(
        "ascii_seed: zero-one",
        "ascii_seed: null\nascii_height: 7"
      ),
      "/tmp/0-intro.md"
    );

    expect(parsed.frontmatter.ascii_seed).toBeNull();
    expect(parsed.frontmatter.ascii_height).toBe(7);
  });

  it("accepts missing summary", () => {
    const parsed = parseSlideMarkdown(
      `---
title: Intro
---
## Scene
Shared context`,
      "/tmp/0-intro.md"
    );

    expect(parsed.frontmatter.summary).toBe("");
  });

  it("accepts null summary", () => {
    const parsed = parseSlideMarkdown(
      `---
title: Intro
summary: null
---
## Scene
Shared context`,
      "/tmp/0-intro.md"
    );

    expect(parsed.frontmatter.summary).toBe("");
  });

  it("accepts fire ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: fire"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("fire");
  });

  it("accepts radar ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: radar"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("radar");
  });

  it("accepts starfield ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: starfield"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("starfield");
  });

  it("accepts circuit-pulse ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: circuit-pulse"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("circuit-pulse");
  });

  it("accepts equalizer ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: equalizer"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("equalizer");
  });

  it("accepts packet-flow ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: packet-flow"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("packet-flow");
  });

  it("accepts tide ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: tide"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("tide");
  });

  it("accepts hourglass ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: hourglass"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("hourglass");
  });

  it("accepts forge ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: forge"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("forge");
  });

  it("accepts swarm ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: swarm"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("swarm");
  });

  it("accepts glitch-banner ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: glitch-banner"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("glitch-banner");
  });

  it("accepts terminal ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: terminal"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("terminal");
  });

  it("accepts game-of-life ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: game-of-life"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("game-of-life");
  });

  it("rejects invalid ascii_seed strings", () => {
    expect(() =>
      parseSlideMarkdown(
        `---
title: Intro
summary: Opening frame
ascii_seed: snake
---

## Scene
Shared context`,
        "/tmp/0-intro.md"
      )
    ).toThrow('"ascii_seed" must be one of zero-one, fire, radar, starfield, circuit-pulse, equalizer, packet-flow, tide, hourglass, forge, swarm, glitch-banner, terminal, game-of-life or null.');
  });

  it("rejects invalid ascii_height values", () => {
    const invalidValues = ["0", "-1", "2.5", '"10"', "true"];

    for (const value of invalidValues) {
      expect(() =>
        parseSlideMarkdown(
          `---
title: Intro
summary: Opening frame
ascii_seed: zero-one
ascii_height: ${value}
---

## Scene
Shared context`,
          "/tmp/0-intro.md"
        )
      ).toThrow('"ascii_height" must be an integer greater than or equal to 1.');
    }
  });

  it("rejects legacy inline ASCII blocks", () => {
    expect(() =>
      parseSlideMarkdown(
        `---
title: Intro
summary: Opening frame
ascii_seed: null
---
## Scene
Shared context

<div align="center" data-slide-ascii><pre>x</pre></div>`,
        "/tmp/0-intro.md"
      )
    ).toThrow('legacy inline ASCII blocks are no longer allowed; use frontmatter "ascii_seed" instead.');
  });

  it("accepts slides with zero sections", () => {
    const parsed = parseSlideMarkdown(buildValidSlide("").replace("## Scene\nShared context", ""), "/tmp/0-intro.md");

    expect(parsed.body).toBe("");
    expect(parsed.sections).toEqual([]);
    expect(parsed.hasMermaid).toBe(false);
  });
});
