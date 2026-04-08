import path from "node:path";

import type { Plugin, ViteDevServer } from "vite";
import { defineConfig } from "vitest/config";

import { writePresentationManifest } from "./src/content/presentation-manifest-file.ts";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "knowledge-sharing";

function markdownManifestReloadPlugin(): Plugin {
  const repoRoot = process.cwd();
  const topicsDirectory = path.join(repoRoot, "topics");
  const outputFile = path.join(repoRoot, "src/generated/presentation-manifest.ts");
  let rebuildQueue = Promise.resolve();

  const isTopicMarkdownFile = (filePath: string): boolean => {
    const relativePath = path.relative(topicsDirectory, filePath);

    return !relativePath.startsWith("..") && !path.isAbsolute(relativePath) && relativePath.endsWith(".md");
  };

  const queueRebuild = (server: ViteDevServer) => {
    rebuildQueue = rebuildQueue.then(async () => {
      try {
        await writePresentationManifest({ topicsDirectory, outputFile });
        server.ws.send({ type: "full-reload" });
      } catch (error) {
        server.config.logger.error("Failed to rebuild presentation manifest from Markdown changes.", { error });
      }
    });
  };

  return {
    name: "markdown-manifest-reload",
    async buildStart() {
      await writePresentationManifest({ topicsDirectory, outputFile });
    },
    configureServer(server) {
      server.watcher.add(topicsDirectory);

      const handleFileEvent = (filePath: string) => {
        if (!isTopicMarkdownFile(filePath)) {
          return;
        }

        queueRebuild(server);
      };

      server.watcher.on("add", handleFileEvent);
      server.watcher.on("change", handleFileEvent);
      server.watcher.on("unlink", handleFileEvent);
    }
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? `/${repositoryName}/` : "/",
  plugins: [markdownManifestReloadPlugin()],
  test: {
    environment: "jsdom",
    globals: true
  }
}));
