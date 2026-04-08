import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { replaceAsciiBlock } from "../src/content/slide-schema.ts";

function readArgument(name) {
  const flagIndex = process.argv.indexOf(`--${name}`);

  if (flagIndex === -1 || flagIndex === process.argv.length - 1) {
    throw new Error(`Missing required argument --${name}`);
  }

  return process.argv[flagIndex + 1];
}

function clampText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}~`;
}

function centerLine(width, text) {
  const clamped = clampText(text, width);
  const leftPadding = Math.max(0, Math.floor((width - clamped.length) / 2));
  const rightPadding = Math.max(0, width - clamped.length - leftPadding);
  return `${" ".repeat(leftPadding)}${clamped}${" ".repeat(rightPadding)}`;
}

function buildAsciiPoster(topic, title, prompt) {
  const width = 150;
  const height = 150;
  const innerWidth = width - 2;
  const innerHeight = height - 2;
  const characters = [".", ":", "*", "+", "o", "x"];
  const seedText = `${topic}|${title}|${prompt}`;
  let seed = 0;

  for (const char of seedText) {
    seed = (seed * 31 + char.charCodeAt(0)) % 2147483647;
  }

  const rows = [];

  for (let rowIndex = 0; rowIndex < innerHeight; rowIndex += 1) {
    let row = "";

    for (let columnIndex = 0; columnIndex < innerWidth; columnIndex += 1) {
      const patternIndex = (seed + rowIndex * 17 + columnIndex * 23 + rowIndex * columnIndex) % characters.length;
      const isFrame = rowIndex % 12 === 0 || columnIndex % 18 === 0;
      row += isFrame ? characters[patternIndex] : " ";
    }

    rows.push(row);
  }

  const titleLine = Math.floor(innerHeight * 0.35);
  const topicLine = titleLine + 2;
  const promptLine = titleLine + 6;
  const footerLine = innerHeight - 8;
  rows[titleLine] = centerLine(innerWidth, title.toUpperCase());
  rows[topicLine] = centerLine(innerWidth, `TOPIC: ${topic}`);
  rows[promptLine] = centerLine(innerWidth, `PROMPT: ${prompt}`);
  rows[footerLine] = centerLine(innerWidth, "GENERATED WITH THE REPO ASCII STYLE");

  const content = [
    `+${"-".repeat(innerWidth)}+`,
    ...rows.map((row) => `|${row}|`),
    `+${"-".repeat(innerWidth)}+`
  ].join("\n");

  return `<div align="center" data-slide-ascii>\n<pre>${content}</pre>\n</div>`;
}

const topic = readArgument("topic");
const targetFile = path.resolve(readArgument("file"));
const raw = await readFile(targetFile, "utf8");
const parsed = matter(raw);
const title =
  typeof parsed.data.title === "string" && parsed.data.title.trim() !== ""
    ? parsed.data.title.trim()
    : path.basename(targetFile, ".md");
const prompt =
  typeof parsed.data.ascii_prompt === "string" && parsed.data.ascii_prompt.trim() !== ""
    ? parsed.data.ascii_prompt.trim()
    : `${topic} ${title}`;
const asciiBlock = buildAsciiPoster(topic, title, prompt);
const nextContent = replaceAsciiBlock(parsed.content.trimStart(), asciiBlock).trimEnd();
const nextFile = matter.stringify(`${nextContent}\n`, parsed.data);

await writeFile(targetFile, nextFile, "utf8");
console.log(`Updated ASCII block in ${targetFile}`);
