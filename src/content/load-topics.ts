import { promises as fs } from "node:fs";
import path from "node:path";

import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdownLanguage from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import MarkdownIt from "markdown-it";

import {
  type AsciiScenario,
  parseSlideFileName,
  parseSlideMarkdown,
  parseTopicDirectoryName,
  titleCaseSlug
} from "./slide-schema.ts";

export interface SlideManifest {
  id: number;
  slug: string;
  title: string;
  summary: string;
  asciiSeed: AsciiScenario | null;
  html: string;
  hasMermaid: boolean;
}

export interface TopicManifest {
  id: number;
  slug: string;
  title: string;
  slides: SlideManifest[];
}

export interface PresentationManifest {
  topics: TopicManifest[];
}

const WRAPPED_CODE_FENCE_LANGUAGES = new Set(["markdown", "md", "plaintext", "text", "txt"]);

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdownLanguage);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFenceLanguage(info: string): string {
  return info.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
}

function shouldWrapCodeFence(language: string): boolean {
  return WRAPPED_CODE_FENCE_LANGUAGES.has(language);
}

function renderCodeFence(code: string, info: string): string {
  const language = getFenceLanguage(info);
  const preClasses = shouldWrapCodeFence(language) ? ["code-block-wrap"] : [];

  if (language && hljs.getLanguage(language)) {
    const highlighted = hljs.highlight(code, {
      language,
      ignoreIllegals: true
    }).value;

    return `<pre class="${[...preClasses, "hljs"].join(" ")}"><code class="hljs language-${language}">${highlighted}</code></pre>`;
  }

  const preClass = preClasses.length > 0 ? ` class="${preClasses.join(" ")}"` : "";
  const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
  return `<pre${preClass}><code${languageClass}>${escapeHtml(code)}</code></pre>`;
}

function createMarkdownRenderer(): MarkdownIt {
  const markdown = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (code, info) => renderCodeFence(code, info)
  });
  const defaultFence: NonNullable<MarkdownIt["renderer"]["rules"]["fence"]> =
    markdown.renderer.rules.fence ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  markdown.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];

    if (token.info.trim() === "mermaid") {
      return `<div class="mermaid">${escapeHtml(token.content.trim())}</div>`;
    }

    return defaultFence(tokens, idx, options, env, self);
  };

  return markdown;
}

export async function buildPresentationManifest(topicsDirectory: string): Promise<PresentationManifest> {
  const markdown = createMarkdownRenderer();
  const entries = await fs.readdir(topicsDirectory, { withFileTypes: true });
  const topicDirectories = entries.filter((entry) => entry.isDirectory()).sort((left, right) => left.name.localeCompare(right.name));
  const seenTopicIds = new Set<number>();
  const topics: TopicManifest[] = [];

  for (const directory of topicDirectories) {
    const topicMeta = parseTopicDirectoryName(directory.name);

    if (seenTopicIds.has(topicMeta.id)) {
      throw new Error(`Duplicate topic id "${topicMeta.id}" in topics directory.`);
    }

    seenTopicIds.add(topicMeta.id);
    const topicPath = path.join(topicsDirectory, directory.name);
    const slideEntries = (await fs.readdir(topicPath, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .sort((left, right) => left.name.localeCompare(right.name));
    const seenSlideIds = new Set<number>();
    const slides: SlideManifest[] = [];

    for (const slideEntry of slideEntries) {
      const slideMeta = parseSlideFileName(slideEntry.name);

      if (seenSlideIds.has(slideMeta.id)) {
        throw new Error(`${topicPath}: duplicate slide id "${slideMeta.id}".`);
      }

      seenSlideIds.add(slideMeta.id);
      const absolutePath = path.join(topicPath, slideEntry.name);
      const raw = await fs.readFile(absolutePath, "utf8");
      const parsed = parseSlideMarkdown(raw, absolutePath);

      slides.push({
        id: slideMeta.id,
        slug: slideMeta.slug,
        title: parsed.frontmatter.title,
        summary: parsed.frontmatter.summary,
        asciiSeed: parsed.frontmatter.ascii_seed,
        html: markdown.render(parsed.body),
        hasMermaid: parsed.hasMermaid
      });
    }

    topics.push({
      id: topicMeta.id,
      slug: topicMeta.slug,
      title: titleCaseSlug(topicMeta.slug),
      slides: slides.sort((left, right) => left.id - right.id)
    });
  }

  return {
    topics: topics.sort((left, right) => left.id - right.id)
  };
}
