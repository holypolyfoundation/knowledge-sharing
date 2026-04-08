import matter from "gray-matter";

export const TOPIC_DIRECTORY_PATTERN = /^(?<id>\d+)-(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)$/;
export const SLIDE_FILE_PATTERN = /^(?<id>\d+)-(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
export const ASCII_BLOCK_PATTERN =
  /<div align="center" data-slide-ascii>\s*<pre>[\s\S]*?<\/pre>\s*<\/div>/g;
export const ASCII_SCENARIOS = ["zero-one", "spaceship", "fire", "pulse", "waves", "scanline", "equalizer", "signal", "radar", "skyline", "terminal", "conveyor", "constellation"] as const;
export type AsciiScenario = (typeof ASCII_SCENARIOS)[number];

export interface SlideFrontmatter {
  title: string;
  summary: string;
  ascii_seed: AsciiScenario | null;
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

function asOptionalString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function asNullableAsciiSeed(value: unknown, filePath: string): AsciiScenario | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${filePath}: "ascii_seed" must be one of ${ASCII_SCENARIOS.join(", ")} or null.`);
  }

  const normalized = value.trim();

  if (!ASCII_SCENARIOS.includes(normalized as AsciiScenario)) {
    throw new Error(`${filePath}: "ascii_seed" must be one of ${ASCII_SCENARIOS.join(", ")} or null.`);
  }

  return normalized as AsciiScenario;
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

export function stripLegacyAsciiBlocks(body: string): string {
  return body.replace(ASCII_BLOCK_PATTERN, "").replace(/^\s+/, "");
}

export function parseSlideMarkdown(raw: string, filePath: string): ParsedSlide {
  const parsed = matter(raw);
  const frontmatter: SlideFrontmatter = {
    title: asNonEmptyString(parsed.data.title, "title", filePath),
    summary: asOptionalString(parsed.data.summary),
    ascii_seed: asNullableAsciiSeed(parsed.data.ascii_seed, filePath)
  };
  const body = parsed.content.trim();

  if (/^#\s+/m.test(body)) {
    throw new Error(`${filePath}: slide body must not contain "# " headings; use frontmatter title instead.`);
  }

  if ([...body.matchAll(ASCII_BLOCK_PATTERN)].length > 0) {
    throw new Error(`${filePath}: legacy inline ASCII blocks are no longer allowed; use frontmatter "ascii_seed" instead.`);
  }

  const sectionMatches = [...body.matchAll(/^##\s+(.+)$/gm)];

  return {
    frontmatter,
    body,
    asciiBlock: "",
    sections: sectionMatches.map((match) => match[1].trim()),
    hasMermaid: /```mermaid\b/.test(body)
  };
}
