import type { PresentationManifest } from "../content/load-topics.ts";

export const presentationManifest: PresentationManifest = {
  "topics": [
    {
      "id": 0,
      "slug": "poly-tg-bot-guide",
      "title": "Poly Tg Bot Guide",
      "slides": [
        {
          "id": 0,
          "slug": "intro",
          "title": "Intro",
          "summary": "",
          "asciiSeed": "zero-one",
          "html": "<h3>Хто я?</h3>\n<ul>\n<li>9 років в SWE / 3 роки в SRE.</li>\n<li>Проєктую складні системи, оцінюю бизнес ризики, працюю над превентивними засобами, що допомагають бізнесам втрачати менше грошей під час інцидетів.</li>\n<li>Приєднався до ком’юніті, допомагаю реалізовувати корисні інструменти та автоматизації в пошуках альфи.</li>\n</ul>\n",
          "hasMermaid": false
        },
        {
          "id": 1,
          "slug": "plan",
          "title": "Plan",
          "summary": "",
          "asciiSeed": "fire",
          "html": "<ol>\n<li>Ретро інжинірінг vs Сучасний інжинірінг</li>\n<li>Робимо тулінг для себе</li>\n<li>Q/A</li>\n</ol>\n",
          "hasMermaid": false
        },
        {
          "id": 2,
          "slug": "retro-enfineering",
          "title": "Retro vs Modern Engineering",
          "summary": "",
          "asciiSeed": "terminal",
          "html": "<h2>Рутина розробника</h2>\n<h3>5 років тому</h3>\n<div class=\"mermaid\">flowchart TB\n  C((Клієнти))\n  GW[API Gateway / BFF]\n\n  subgraph identity[&quot;Ідентичність і граф&quot;]\n    AUTH[Auth]\n    PROFILE[Профілі]\n    GRAPH[Social graph&lt;br/&gt;підписки]\n  end\n\n  subgraph content[&quot;Контент&quot;]\n    POST[Пости / твіти]\n    MEDIA[Медіа]\n    FEED[Стрічка]\n  end\n\n  subgraph comm[&quot;Пошук і комунікації&quot;]\n    SEARCH[Пошук]\n    NOTIFY[Сповіщення]\n    DM[Direct messages]\n  end\n\n  C --&gt; GW\n  GW --&gt; AUTH &amp; PROFILE &amp; GRAPH &amp; POST &amp; MEDIA &amp; FEED &amp; SEARCH &amp; NOTIFY &amp; DM\n\n  AUTH --&gt; PROFILE\n  GRAPH --&gt; PROFILE\n  POST --&gt; MEDIA\n  FEED --&gt; GRAPH\n  FEED --&gt; POST\n  SEARCH --&gt; POST\n  NOTIFY --&gt; POST\n  NOTIFY --&gt; PROFILE\n  DM --&gt; AUTH\n  DM --&gt; PROFILE</div><h3>Сьогодні</h3>\n<pre class=\"code-block-wrap hljs\"><code class=\"hljs language-md\">Згенеруй систему: API Gateway, Auth → Profile, Social graph → Profile, пости з медіа, стрічка що збирає граф + пости, пошук по постах, сповіщення про пости і профілі, DM з перевіркою auth. Имплементуй проект, зроби його готовим до високого навантаження. Не роби помилок!\n</code></pre>\n<h2>Рутина вайбкодера</h2>\n<h3>5 років тому</h3>\n<h3>Сьогодні</h3>\n<pre class=\"code-block-wrap hljs\"><code class=\"hljs language-md\">Я хочу HFT бота з прибутковою стратегією та без loss. Зроби швидко та без помилок!\n</code></pre>\n",
          "hasMermaid": true
        },
        {
          "id": 3,
          "slug": "how-to-prompt",
          "title": "How To Prompt",
          "summary": "Explain the role prompt structure plays in consistent bot behavior.",
          "asciiSeed": null,
          "html": "<h2>Prompt Pattern</h2>\n<p>The prompt should tell the bot:</p>\n<ul>\n<li>who it is</li>\n<li>what boundaries matter</li>\n<li>what output shape we expect</li>\n<li>how to verify success</li>\n</ul>\n<h2>Why It Works</h2>\n<p>Better prompts reduce ambiguity, which means less rework and fewer accidental changes outside the intended scope.</p>\n",
          "hasMermaid": false
        },
        {
          "id": 4,
          "slug": "bot-implementation",
          "title": "Bot Implementation",
          "summary": "Walk through the high-level bot architecture and message flow.",
          "asciiSeed": null,
          "html": "<h2>Flow</h2>\n<div class=\"mermaid\">flowchart LR\n  U[Telegram user] --&gt; T[Telegram update]\n  T --&gt; B[Bot runtime]\n  B --&gt; P[Prompt + policy layer]\n  P --&gt; M[Market data]\n  M --&gt; B\n  B --&gt; R[Reply back to user]</div><h2>Implementation Notes</h2>\n<ul>\n<li>keep the transport layer thin</li>\n<li>isolate prompt policy from integration code</li>\n<li>add validation around external data before answering</li>\n</ul>\n",
          "hasMermaid": true
        },
        {
          "id": 5,
          "slug": "useful-refs",
          "title": "Useful Refs",
          "summary": "Point the audience to the artifacts that matter after the talk.",
          "asciiSeed": null,
          "html": "<h2>Reference Set</h2>\n<ul>\n<li>product and planning notes</li>\n<li>implementation source</li>\n<li>prompt examples</li>\n<li>rollout and troubleshooting docs</li>\n</ul>\n<h2>Use After The Talk</h2>\n<p>This slide helps the audience continue on their own instead of relying on the presenter to remember every detail.</p>\n",
          "hasMermaid": false
        },
        {
          "id": 6,
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
