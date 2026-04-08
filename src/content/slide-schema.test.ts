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

  it("accepts spaceship ascii_seed", () => {
    const parsed = parseSlideMarkdown(buildValidSlide().replace("ascii_seed: zero-one", "ascii_seed: spaceship"), "/tmp/0-intro.md");

    expect(parsed.frontmatter.ascii_seed).toBe("spaceship");
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
    ).toThrow('"ascii_seed" must be one of zero-one, spaceship or null.');
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
