import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { ASCII_SCENARIOS, type AsciiScenario, stripLegacyAsciiBlocks } from "../content/slide-schema.ts";

export function parseAsciiScenarioInput(input: string): AsciiScenario | null {
  const normalized = input.trim().toLowerCase();

  if (normalized === "null" || normalized === "none") {
    return null;
  }

  if (ASCII_SCENARIOS.includes(normalized as AsciiScenario)) {
    return normalized as AsciiScenario;
  }

  throw new Error(`Invalid ascii scenario "${input}". Expected one of ${ASCII_SCENARIOS.join(", ")}, null, or none.`);
}

function orderedFrontmatter(data: Record<string, unknown>): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};

  for (const key of ["title", "summary", "ascii_seed"]) {
    if (key in data) {
      ordered[key] = data[key];
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (!(key in ordered)) {
      ordered[key] = value;
    }
  }

  return ordered;
}

function serializeFrontmatterValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(String(value));
}

function stringifyFrontmatter(data: Record<string, unknown>): string {
  const lines = Object.entries(data).map(([key, value]) => `${key}: ${serializeFrontmatterValue(value)}`);
  return `---\n${lines.join("\n")}\n---`;
}

export async function updateSlideAsciiSeed(slidePath: string, scenario: string): Promise<AsciiScenario | null> {
  const absolutePath = path.resolve(slidePath);
  const raw = await readFile(absolutePath, "utf8");
  const parsed = matter(raw);
  const asciiSeed = parseAsciiScenarioInput(scenario);
  const nextData = orderedFrontmatter({
    ...parsed.data,
    ascii_seed: asciiSeed
  });

  delete nextData.ascii_prompt;

  const nextBody = stripLegacyAsciiBlocks(parsed.content).trimStart();
  const nextContent = `${stringifyFrontmatter(nextData)}\n${nextBody.trimEnd()}\n`;

  await writeFile(absolutePath, nextContent, "utf8");
  return asciiSeed;
}
