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
          "html": "<ol>\n<li>Ретро vs Сучасний інжинірінг</li>\n<li>Робимо тулінг для себе\n<ol>\n<li>Як спілкуватись з AI?</li>\n<li>Архітектура бота</li>\n</ol>\n</li>\n<li>Q/A</li>\n</ol>\n",
          "hasMermaid": false
        },
        {
          "id": 2,
          "slug": "retro-enfineering",
          "title": "Retro vs Modern Engineering",
          "summary": "",
          "asciiSeed": "terminal",
          "html": "<h2>Рутина інженера</h2>\n<h3>5 років тому</h3>\n<div class=\"mermaid\">flowchart TB\n  C((Клієнти))\n  GW[API Gateway / BFF]\n\n  subgraph identity[&quot;Ідентичність і граф&quot;]\n    AUTH[Auth]\n    PROFILE[Профілі]\n    GRAPH[Social graph&lt;br/&gt;підписки]\n  end\n\n  subgraph content[&quot;Контент&quot;]\n    POST[Пости / твіти]\n    MEDIA[Медіа]\n    FEED[Стрічка]\n  end\n\n  subgraph comm[&quot;Пошук і комунікації&quot;]\n    SEARCH[Пошук]\n    NOTIFY[Сповіщення]\n    DM[Direct messages]\n  end\n\n  C --&gt; GW\n  GW --&gt; AUTH &amp; PROFILE &amp; GRAPH &amp; POST &amp; MEDIA &amp; FEED &amp; SEARCH &amp; NOTIFY &amp; DM\n\n  AUTH --&gt; PROFILE\n  GRAPH --&gt; PROFILE\n  POST --&gt; MEDIA\n  FEED --&gt; GRAPH\n  FEED --&gt; POST\n  SEARCH --&gt; POST\n  NOTIFY --&gt; POST\n  NOTIFY --&gt; PROFILE\n  DM --&gt; AUTH\n  DM --&gt; PROFILE</div><h3>Сьогодні</h3>\n<pre class=\"code-block-wrap hljs\"><code class=\"hljs language-md\">Згенеруй систему: API Gateway, Auth → Profile, Social graph → Profile, пости з медіа, стрічка що збирає граф + пости, пошук по постах, сповіщення про пости і профілі, DM з перевіркою auth. Имплементуй проект, зроби його готовим до високого навантаження. Не роби помилок!\n</code></pre>\n<h2>Рутина НЕ інженера</h2>\n<h3>5 років тому</h3>\n<p><img src=\"topics/0-poly-tg-bot-guide/assets/retro-vibe.png\" alt=\"Ретро-вайб інженерії\"></p>\n<h3>Сьогодні</h3>\n<pre class=\"code-block-wrap hljs\"><code class=\"hljs language-md\">Я хочу HFT бота з прибутковою стратегією та без loss.\n</code></pre>\n",
          "hasMermaid": true
        },
        {
          "id": 3,
          "slug": "how-to-prompt",
          "title": "How to ask AI?",
          "summary": "",
          "asciiSeed": null,
          "html": "",
          "hasMermaid": false
        },
        {
          "id": 4,
          "slug": "bot-implementation",
          "title": "Bot Implementation",
          "summary": "",
          "asciiSeed": null,
          "html": "",
          "hasMermaid": false
        },
        {
          "id": 5,
          "slug": "useful-refs",
          "title": "Useful Refs",
          "summary": "",
          "asciiSeed": null,
          "html": "",
          "hasMermaid": false
        },
        {
          "id": 6,
          "slug": "qa",
          "title": "Q&A",
          "summary": "",
          "asciiSeed": null,
          "html": "<h2>Питання?</h2>\n",
          "hasMermaid": false
        }
      ]
    }
  ]
};

export default presentationManifest;
