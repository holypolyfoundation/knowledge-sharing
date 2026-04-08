import { promises as fs } from "node:fs";
import path from "node:path";

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createMarkdownRenderer(): MarkdownIt {
  const markdown = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
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
