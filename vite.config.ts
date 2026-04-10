import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Plugin, ViteDevServer } from "vite";
import { defineConfig } from "vitest/config";

import { buildPresentationManifest } from "./src/content/load-topics.ts";
import { renderPresentationManifestModule } from "./src/content/presentation-manifest-module.ts";
import { copyTopicAssets, isTopicAssetFile, resolveTopicAssetPublicPath } from "./src/content/topic-assets.ts";
import { SITE_DOCUMENT_TITLE_DEFAULT } from "./src/presentation/site-brand.ts";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "knowledge-sharing";
const PRESENTATION_MANIFEST_ID = "virtual:presentation-manifest";
const RESOLVED_PRESENTATION_MANIFEST_ID = `\0${PRESENTATION_MANIFEST_ID}`;

function injectSiteDocumentTitlePlugin(): Plugin {
  return {
    name: "inject-site-document-title",
    transformIndexHtml(html: string) {
      return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${SITE_DOCUMENT_TITLE_DEFAULT}</title>`);
    }
  };
}

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
  let rebuildQueue = Promise.resolve();
  let buildOutputDirectory = path.join(repoRoot, "dist");
  let cachedManifestModule: string | null = null;

  const isTopicMarkdownFile = (filePath: string): boolean => {
    const relativePath = path.relative(topicsDirectory, filePath);

    return !relativePath.startsWith("..") && !path.isAbsolute(relativePath) && relativePath.endsWith(".md");
  };

  const refreshManifestModule = async () => {
    const manifest = await buildPresentationManifest(topicsDirectory);
    cachedManifestModule = renderPresentationManifestModule(manifest);
  };

  const invalidateManifestModule = (server: ViteDevServer) => {
    const module = server.moduleGraph.getModuleById(RESOLVED_PRESENTATION_MANIFEST_ID);

    if (module) {
      server.moduleGraph.invalidateModule(module);
    }
  };

  const queueRebuild = (server: ViteDevServer) => {
    rebuildQueue = rebuildQueue.then(async () => {
      try {
        await refreshManifestModule();
        invalidateManifestModule(server);
        server.ws.send({ type: "full-reload" });
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        server.config.logger.error(`Failed to rebuild presentation manifest from Markdown changes.\n${details}`, { error });
      }
    });
  };

  return {
    name: "markdown-manifest-reload",
    resolveId(id) {
      if (id === PRESENTATION_MANIFEST_ID) {
        return RESOLVED_PRESENTATION_MANIFEST_ID;
      }

      return null;
    },
    async load(id) {
      if (id !== RESOLVED_PRESENTATION_MANIFEST_ID) {
        return null;
      }

      if (!cachedManifestModule) {
        await refreshManifestModule();
      }

      return cachedManifestModule;
    },
    configResolved(config) {
      buildOutputDirectory = path.resolve(repoRoot, config.build.outDir);
    },
    async buildStart() {
      await refreshManifestModule();
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
  plugins: process.env.VITEST ? [] : [markdownManifestReloadPlugin(command), injectSiteDocumentTitlePlugin()],
  test: {
    environment: "jsdom",
    globals: true
  }
}));
