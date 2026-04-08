import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Plugin, ViteDevServer } from "vite";
import { defineConfig } from "vitest/config";

import { copyTopicAssets, isTopicAssetFile, resolveTopicAssetPublicPath } from "./src/content/topic-assets.ts";
import { writePresentationManifest } from "./src/content/presentation-manifest-file.ts";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "knowledge-sharing";

function contentTypeForAsset(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

function markdownManifestReloadPlugin(command: "build" | "serve"): Plugin {
  const repoRoot = process.cwd();
  const topicsDirectory = path.join(repoRoot, "topics");
  const outputFile = path.join(repoRoot, "src/generated/presentation-manifest.ts");
  let rebuildQueue = Promise.resolve();
  let buildOutputDirectory = path.join(repoRoot, "dist");

  const isTopicMarkdownFile = (filePath: string): boolean => {
    const relativePath = path.relative(topicsDirectory, filePath);

    return !relativePath.startsWith("..") && !path.isAbsolute(relativePath) && relativePath.endsWith(".md");
  };

  const queueRebuild = (server: ViteDevServer) => {
    rebuildQueue = rebuildQueue.then(async () => {
      try {
        await writePresentationManifest({ topicsDirectory, outputFile });
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        server.config.logger.error(`Failed to rebuild presentation manifest from Markdown changes.\n${details}`, { error });
      }
    });
  };

  return {
    name: "markdown-manifest-reload",
    configResolved(config) {
      buildOutputDirectory = path.resolve(repoRoot, config.build.outDir);
    },
    async buildStart() {
      await writePresentationManifest({ topicsDirectory, outputFile });
    },
    async closeBundle() {
      if (command === "build") {
        await copyTopicAssets(topicsDirectory, buildOutputDirectory);
      }
    },
    configureServer(server) {
      server.watcher.add(topicsDirectory);

      server.middlewares.use(async (req, res, next) => {
        const requestPath = req.url ? decodeURIComponent(req.url.split("?", 1)[0]) : "";
        const assetFile = resolveTopicAssetPublicPath(requestPath, topicsDirectory);

        if (!assetFile) {
          next();
          return;
        }

        try {
          const assetContent = await readFile(assetFile);
          res.statusCode = 200;
          res.setHeader("Content-Type", contentTypeForAsset(assetFile));

          if (req.method === "HEAD") {
            res.end();
            return;
          }

          res.end(assetContent);
        } catch {
          next();
        }
      });

      const handleFileEvent = (filePath: string) => {
        if (isTopicMarkdownFile(filePath)) {
          queueRebuild(server);
          return;
        }

        if (isTopicAssetFile(filePath, topicsDirectory)) {
          server.ws.send({ type: "full-reload" });
        }
      };

      server.watcher.on("add", handleFileEvent);
      server.watcher.on("change", handleFileEvent);
      server.watcher.on("unlink", handleFileEvent);
    }
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? `/${repositoryName}/` : "/",
  plugins: process.env.VITEST ? [] : [markdownManifestReloadPlugin(command)],
  test: {
    environment: "jsdom",
    globals: true
  }
}));
