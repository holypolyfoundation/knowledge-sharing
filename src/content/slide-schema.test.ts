import { describe, expect, it } from "vitest";

import { parseSlideMarkdown } from "./slide-schema.ts";

function buildValidSlide(body = ""): string {
  return `---
title: Intro
summary: Opening frame
ascii_prompt: market bot terminal skyline
---
<div align="center" data-slide-ascii>
<pre>+-+
|*|
+-+</pre>
</div>

## Scene
Shared context

${body}`;
}

describe("parseSlideMarkdown", () => {
  it("accepts a valid slide with centered ASCII and mermaid", () => {
    const parsed = parseSlideMarkdown(
      buildValidSlide(`## Flow
\`\`\`mermaid
graph LR
  A[Idea] --> B[Slide]
\`\`\``),
      "/tmp/0-intro.md"
    );

    expect(parsed.frontmatter.title).toBe("Intro");
    expect(parsed.sections).toEqual(["Scene", "Flow"]);
    expect(parsed.hasMermaid).toBe(true);
  });

  it("rejects missing frontmatter fields", () => {
    expect(() =>
      parseSlideMarkdown(
        `---
title: Intro
summary: Opening frame
---
<div align="center" data-slide-ascii><pre>x</pre></div>

## Scene
Shared context`,
        "/tmp/0-intro.md"
      )
    ).toThrow('missing required frontmatter field "ascii_prompt"');
  });

  it("rejects missing ASCII blocks", () => {
    expect(() =>
      parseSlideMarkdown(
        `---
title: Intro
summary: Opening frame
ascii_prompt: market bot terminal skyline
---

## Scene
Shared context`,
        "/tmp/0-intro.md"
      )
    ).toThrow("expected exactly one centered ASCII block");
  });

  it("rejects ASCII after the first section", () => {
    expect(() =>
      parseSlideMarkdown(
        `---
title: Intro
summary: Opening frame
ascii_prompt: market bot terminal skyline
---
## Scene
Shared context

<div align="center" data-slide-ascii><pre>x</pre></div>`,
        "/tmp/0-intro.md"
      )
    ).toThrow("ASCII block must appear before the first section");
  });

  it("rejects slides with zero sections", () => {
    expect(() => parseSlideMarkdown(buildValidSlide("").replace("## Scene\nShared context", "Body only"), "/tmp/0-intro.md")).toThrow(
      'slide body must contain at least one "##" section'
    );
  });
});
