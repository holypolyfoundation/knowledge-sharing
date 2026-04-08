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
    background: "#000000",
    primaryColor: "#09090b",
    primaryTextColor: "#f4f4f5",
    primaryBorderColor: "#c9b99a",
    lineColor: "#c9b99a",
    secondaryColor: "#18181b",
    tertiaryColor: "#09090b",
    mainBkg: "#000000",
    nodeBkg: "#09090b",
    clusterBkg: "#09090b",
    edgeLabelBackground: "#000000",
    fontFamily: '"GeistMono", ui-monospace, monospace'
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
