import matter from "gray-matter";

export const TOPIC_DIRECTORY_PATTERN = /^(?<id>\d+)-(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)$/;
export const SLIDE_FILE_PATTERN = /^(?<id>\d+)-(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
export const ASCII_BLOCK_PATTERN =
  /<div align="center" data-slide-ascii>\s*<pre>[\s\S]*?<\/pre>\s*<\/div>/g;

export interface SlideFrontmatter {
  title: string;
  summary: string;
  ascii_prompt: string;
}

export interface ParsedSlide {
  frontmatter: SlideFrontmatter;
  body: string;
  asciiBlock: string;
  sections: string[];
  hasMermaid: boolean;
}

function asNonEmptyString(value: unknown, fieldName: keyof SlideFrontmatter, filePath: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${filePath}: missing required frontmatter field "${fieldName}"`);
  }

  return value.trim();
}

export function parseTopicDirectoryName(directoryName: string): { id: number; slug: string } {
  const match = TOPIC_DIRECTORY_PATTERN.exec(directoryName);

  if (!match?.groups) {
    throw new Error(`Invalid topic directory name "${directoryName}". Expected "<number>-<slug>".`);
  }

  return {
    id: Number.parseInt(match.groups.id, 10),
    slug: match.groups.slug
  };
}

export function parseSlideFileName(fileName: string): { id: number; slug: string } {
  const match = SLIDE_FILE_PATTERN.exec(fileName);

  if (!match?.groups) {
    throw new Error(`Invalid slide file name "${fileName}". Expected "<number>-<slug>.md".`);
  }

  return {
    id: Number.parseInt(match.groups.id, 10),
    slug: match.groups.slug
  };
}

export function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function replaceAsciiBlock(body: string, asciiBlock: string): string {
  const matches = [...body.matchAll(ASCII_BLOCK_PATTERN)];

  if (matches.length === 0) {
    return body.trimStart().length === 0 ? `${asciiBlock}\n` : `${asciiBlock}\n\n${body.trimStart()}`;
  }

  if (matches.length > 1) {
    throw new Error("Cannot replace ASCII block when more than one block exists.");
  }

  return body.replace(ASCII_BLOCK_PATTERN, asciiBlock);
}

export function parseSlideMarkdown(raw: string, filePath: string): ParsedSlide {
  const parsed = matter(raw);
  const frontmatter: SlideFrontmatter = {
    title: asNonEmptyString(parsed.data.title, "title", filePath),
    summary: asNonEmptyString(parsed.data.summary, "summary", filePath),
    ascii_prompt: asNonEmptyString(parsed.data.ascii_prompt, "ascii_prompt", filePath)
  };
  const body = parsed.content.trim();
  const asciiMatches = [...body.matchAll(ASCII_BLOCK_PATTERN)];

  if (asciiMatches.length !== 1) {
    throw new Error(`${filePath}: expected exactly one centered ASCII block.`);
  }

  if (/^#\s+/m.test(body)) {
    throw new Error(`${filePath}: slide body must not contain "# " headings; use frontmatter title instead.`);
  }

  const sectionMatches = [...body.matchAll(/^##\s+(.+)$/gm)];

  if (sectionMatches.length === 0) {
    throw new Error(`${filePath}: slide body must contain at least one "##" section.`);
  }

  const asciiBlock = asciiMatches[0][0];
  const asciiIndex = asciiMatches[0].index ?? -1;
  const firstSectionIndex = sectionMatches[0].index ?? Number.MAX_SAFE_INTEGER;

  if (asciiIndex > firstSectionIndex) {
    throw new Error(`${filePath}: ASCII block must appear before the first section.`);
  }

  return {
    frontmatter,
    body,
    asciiBlock,
    sections: sectionMatches.map((match) => match[1].trim()),
    hasMermaid: /```mermaid\b/.test(body)
  };
}
