import type { PresentationManifest } from "../content/load-topics.ts";

export const presentationManifest: PresentationManifest = {
  "topics": [
    {
      "id": 0,
      "slug": "intro-with-poly-tg-bot-guide",
      "title": "Intro With Poly Tg Bot Guide",
      "slides": [
        {
          "id": 0,
          "slug": "intro",
          "title": "Інтро",
          "summary": "Хто я?",
          "asciiSeed": "zero-one",
          "html": "",
          "hasMermaid": false
        },
        {
          "id": 1,
          "slug": "plan",
          "title": "Plan",
          "summary": "Show the workstream that turns an idea into a shippable bot.",
          "asciiSeed": "spaceship",
          "html": "<h2>Workstream</h2>\n<p>The deck follows the same sequence the team follows in code:</p>\n<ul>\n<li>decide the user outcome</li>\n<li>shape the prompts and system behavior</li>\n<li>implement the bot flow</li>\n<li>verify the quality and rollout path</li>\n</ul>\n<h2>What Good Looks Like</h2>\n<p>By the end of the topic, the audience should understand both the product idea and the engineering discipline that made it reliable.</p>\n",
          "hasMermaid": false
        },
        {
          "id": 2,
          "slug": "engineering-retro",
          "title": "Engineering Retro",
          "summary": "Capture what changed once the first version met real usage.",
          "asciiSeed": null,
          "html": "<h2>What We Learned</h2>\n<ul>\n<li>Real users care more about trust and clarity than raw feature count</li>\n<li>Prompt quality and fallback behavior mattered as much as API wiring</li>\n<li>Lightweight docs reduced confusion when the flow changed quickly</li>\n</ul>\n<h2>Retro Angle</h2>\n<p>This slide creates space to discuss the engineering feedback loop instead of pretending the first version was perfect.</p>\n",
          "hasMermaid": false
        },
        {
          "id": 3,
          "slug": "modern-engineering",
          "title": "Modern Engineering",
          "summary": "Reframe software delivery around fast iteration with explicit validation.",
          "asciiSeed": "zero-one",
          "html": "<h2>Shift In Practice</h2>\n<p>Modern engineering is not just writing code faster. It is building faster feedback between intent, implementation, verification, and communication.</p>\n<h2>What This Means Here</h2>\n<p>Our Markdown presentation repo mirrors that mindset:</p>\n<ul>\n<li>content is source-controlled</li>\n<li>validation runs automatically</li>\n<li>the renderer is generated from the same source as the talk</li>\n</ul>\n",
          "hasMermaid": false
        },
        {
          "id": 4,
          "slug": "how-to-prompt",
          "title": "How To Prompt",
          "summary": "Explain the role prompt structure plays in consistent bot behavior.",
          "asciiSeed": null,
          "html": "<h2>Prompt Pattern</h2>\n<p>The prompt should tell the bot:</p>\n<ul>\n<li>who it is</li>\n<li>what boundaries matter</li>\n<li>what output shape we expect</li>\n<li>how to verify success</li>\n</ul>\n<h2>Why It Works</h2>\n<p>Better prompts reduce ambiguity, which means less rework and fewer accidental changes outside the intended scope.</p>\n",
          "hasMermaid": false
        },
        {
          "id": 5,
          "slug": "bot-implementation",
          "title": "Bot Implementation",
          "summary": "Walk through the high-level bot architecture and message flow.",
          "asciiSeed": null,
          "html": "<h2>Flow</h2>\n<div class=\"mermaid\">flowchart LR\n  U[Telegram user] --&gt; T[Telegram update]\n  T --&gt; B[Bot runtime]\n  B --&gt; P[Prompt + policy layer]\n  P --&gt; M[Market data]\n  M --&gt; B\n  B --&gt; R[Reply back to user]</div><h2>Implementation Notes</h2>\n<ul>\n<li>keep the transport layer thin</li>\n<li>isolate prompt policy from integration code</li>\n<li>add validation around external data before answering</li>\n</ul>\n",
          "hasMermaid": true
        },
        {
          "id": 6,
          "slug": "useful-refs",
          "title": "Useful Refs",
          "summary": "Point the audience to the artifacts that matter after the talk.",
          "asciiSeed": null,
          "html": "<h2>Reference Set</h2>\n<ul>\n<li>product and planning notes</li>\n<li>implementation source</li>\n<li>prompt examples</li>\n<li>rollout and troubleshooting docs</li>\n</ul>\n<h2>Use After The Talk</h2>\n<p>This slide helps the audience continue on their own instead of relying on the presenter to remember every detail.</p>\n",
          "hasMermaid": false
        },
        {
          "id": 7,
          "slug": "qa",
          "title": "Q&A",
          "summary": "Close with the questions that usually unlock the next useful conversation.",
          "asciiSeed": null,
          "html": "<h2>Good Closing Questions</h2>\n<ul>\n<li>Where did the bot need the most guardrails?</li>\n<li>What part was easiest to change once the architecture was in place?</li>\n<li>Which repo patterns would we reuse for the next AI-assisted tool?</li>\n</ul>\n<h2>Exit</h2>\n<p>The goal is to leave the room with reusable engineering practices, not just a cool demo.</p>\n",
          "hasMermaid": false
        }
      ]
    }
  ]
};

export default presentationManifest;
