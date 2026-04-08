import { defineConfig } from "vitest/config";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "knowledge-sharing";

export default defineConfig(({ command }) => ({
  base: command === "build" ? `/${repositoryName}/` : "/",
  test: {
    environment: "jsdom",
    globals: true
  }
}));
