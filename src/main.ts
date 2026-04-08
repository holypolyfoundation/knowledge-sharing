import mermaid from "mermaid";

import presentationManifest from "./generated/presentation-manifest.ts";
import { createPresentationApp } from "./presentation/app.ts";
import "./styles.css";

const appRoot = document.querySelector<HTMLElement>("#app");

if (!appRoot) {
  throw new Error('Missing root element "#app".');
}

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  securityLevel: "loose",
  themeVariables: {
    primaryColor: "#f0c25b",
    primaryTextColor: "#1c1208",
    primaryBorderColor: "#8b5e1a",
    lineColor: "#8b5e1a",
    tertiaryColor: "#fff4d2",
    fontFamily: "Source Sans 3, sans-serif"
  }
});

void createPresentationApp({
  root: appRoot,
  manifest: presentationManifest,
  mermaidAdapter: {
    async render(container) {
      const nodes = Array.from(container.querySelectorAll<HTMLElement>(".mermaid"));

      if (nodes.length === 0) {
        return;
      }

      await mermaid.run({
        nodes
      });
    }
  }
});
