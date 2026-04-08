import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

export const TOPIC_ASSET_DIRECTORY = "assets";
export const TOPIC_PUBLIC_DIRECTORY = "topics";

function hasUrlScheme(value: string): boolean {
  return /^[a-z][a-z\d+\-.]*:/i.test(value);
}

function isProtectedUrl(value: string): boolean {
  return value.startsWith("#") || value.startsWith("/") || value.startsWith("//") || hasUrlScheme(value);
}

function normalizeTopicAssetReference(value: string): string | null {
  if (isProtectedUrl(value)) {
    return null;
  }

  const withoutDotSlash = value.startsWith("./") ? value.slice(2) : value;

  if (!withoutDotSlash.startsWith(`${TOPIC_ASSET_DIRECTORY}/`)) {
    return null;
  }

  const assetPath = path.posix.normalize(withoutDotSlash.slice(TOPIC_ASSET_DIRECTORY.length + 1));

  if (assetPath.length === 0 || assetPath === "." || assetPath === ".." || assetPath.startsWith("../")) {
    return null;
  }

  return assetPath;
}

export function rewriteTopicAssetUrl(sourceUrl: string, topicDirectoryName: string): string {
  const assetPath = normalizeTopicAssetReference(sourceUrl);

  if (!assetPath) {
    return sourceUrl;
  }

  return path.posix.join(TOPIC_PUBLIC_DIRECTORY, topicDirectoryName, TOPIC_ASSET_DIRECTORY, assetPath);
}

/**
 * Rewrites `src="./assets/..."` and `src="assets/..."` in rendered HTML (e.g. raw `<img>` tags)
 * so topic-local assets resolve the same way as Markdown image syntax.
 */
export function rewriteTopicAssetSrcInHtml(html: string, topicDirectoryName: string): string {
  return html.replace(/\bsrc="(\.\/)?assets\/([^"]+)"/g, (_match, _dotSlash: string, assetRest: string) => {
    const rewritten = rewriteTopicAssetUrl(`./assets/${assetRest}`, topicDirectoryName);
    return `src="${rewritten}"`;
  });
}

export function isTopicAssetFile(filePath: string, topicsDirectory: string): boolean {
  const relativePath = path.relative(topicsDirectory, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return false;
  }

  const segments = relativePath.split(path.sep);
  return segments.length >= 3 && segments[1] === TOPIC_ASSET_DIRECTORY;
}

export function resolveTopicAssetPublicPath(publicPath: string, topicsDirectory: string): string | null {
  const normalizedPath = path.posix.normalize(publicPath.replace(/^\/+/, ""));

  if (normalizedPath.length === 0 || normalizedPath === "." || normalizedPath === ".." || normalizedPath.startsWith("../")) {
    return null;
  }

  const segments = normalizedPath.split("/").filter(Boolean);

  if (segments.length < 4 || segments[0] !== TOPIC_PUBLIC_DIRECTORY || segments[2] !== TOPIC_ASSET_DIRECTORY) {
    return null;
  }

  const repoRoot = path.resolve(topicsDirectory, "..");
  const absolutePath = path.resolve(repoRoot, normalizedPath);
  const relativeToTopics = path.relative(topicsDirectory, absolutePath);

  if (relativeToTopics.startsWith("..") || path.isAbsolute(relativeToTopics)) {
    return null;
  }

  return absolutePath;
}

async function collectTopicAssetFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectTopicAssetFiles(absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

export async function copyTopicAssets(topicsDirectory: string, outputDirectory: string): Promise<string[]> {
  const topicEntries = await readdir(topicsDirectory, { withFileTypes: true });
  const copiedFiles: string[] = [];

  for (const entry of topicEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const assetDirectory = path.join(topicsDirectory, entry.name, TOPIC_ASSET_DIRECTORY);

    try {
      const assetFiles = await collectTopicAssetFiles(assetDirectory);

      for (const sourceFile of assetFiles) {
        const relativeAssetPath = path.relative(topicsDirectory, sourceFile);
        const destinationFile = path.join(outputDirectory, TOPIC_PUBLIC_DIRECTORY, relativeAssetPath);

        await mkdir(path.dirname(destinationFile), { recursive: true });
        await copyFile(sourceFile, destinationFile);
        copiedFiles.push(destinationFile);
      }
    } catch (error) {
      const isMissingAssetDirectory =
        error instanceof Error && "code" in error && error.code === "ENOENT";

      if (!isMissingAssetDirectory) {
        throw error;
      }
    }
  }

  return copiedFiles.sort();
}
