import { afterEach, describe, expect, it, vi } from "vitest";

import { createPresentationApp } from "./app.ts";

const manifest = {
  topics: [
    {
      id: 0,
      slug: "demo",
      title: "Demo",
      slides: [
        {
        id: 0,
        slug: "intro",
        title: "Intro",
        summary: "Opening slide",
        asciiSeed: "zero-one",
        asciiHeight: 10,
        html: '<h2>Scene</h2><figure class="mermaid-block" data-mermaid-block tabindex="0" aria-label="Expand Mermaid diagram"><div class="mermaid">graph TD; A-->B;</div></figure>',
        hasMermaid: true
      },
        {
          id: 1,
        slug: "next-step",
        title: "Next Step",
        summary: "",
        asciiSeed: null,
        asciiHeight: 5,
        html: "<h2>Plan</h2><p>Keep going</p>",
        hasMermaid: false
      }
      ]
    }
  ]
};

async function flushUi(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  document.body.innerHTML = "";
  window.location.hash = "";
});

describe("createPresentationApp", () => {
  it("shows the topic list on first load", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    createPresentationApp({
      root: document.querySelector("#root") as HTMLElement,
      manifest
    });

    await flushUi();

    expect(document.querySelector(".telemetry-strip")).toBeNull();
    expect(document.querySelector(".system-header")).toBeNull();
    expect(document.querySelector(".hud-intro")).toBeNull();
    expect(document.querySelector(".topic-module")?.textContent).toContain("Demo");
    expect(document.title).toBe("[01]");
  });

  it("opens the first slide when a topic is selected", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    createPresentationApp({
      root: document.querySelector("#root") as HTMLElement,
      manifest
    });

    await flushUi();
    (document.querySelector(".topic-module") as HTMLButtonElement).click();
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await flushUi();

    expect(document.querySelector(".telemetry-strip")).toBeNull();
    expect(document.querySelector(".system-header")).toBeNull();
    expect(document.title).toBe("[S01/02]");
    expect(document.querySelector(".stage-heading h1")?.textContent).toBe("Intro");
    expect(document.querySelector(".slide-ascii pre")?.textContent?.split("\n")).toHaveLength(10);
    expect(document.querySelector(".slide-ascii")?.getAttribute("style")).toContain("--ascii-rows: 10");
    expect(window.location.hash).toContain("/slide/0");
  });

  it("updates prev and next controls and renders mermaid slides", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      value: scrollTo,
      writable: true,
      configurable: true
    });
    const mermaidRender = vi.fn().mockImplementation(async (container: HTMLElement) => {
      const node = container.querySelector(".mermaid");

      if (node) {
        node.innerHTML = '<svg viewBox="0 0 100 50"><a href="#node"><text x="10" y="20">Node</text></a><rect x="5" y="5" width="90" height="40"></rect></svg>';
      }
    });
    window.location.hash = "#/topic/0-demo/slide/0";

    createPresentationApp({
      root: document.querySelector("#root") as HTMLElement,
      manifest,
      mermaidAdapter: {
        render: mermaidRender
      }
    });

    await flushUi();
    expect(document.title).toBe("[S01/02]");
    expect(mermaidRender).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".telemetry-strip")).toBeNull();
    expect(document.querySelector(".system-header")).toBeNull();
    expect(document.querySelector(".slide-stage")).not.toBeNull();
    expect(document.querySelector(".slide-ascii")).not.toBeNull();
    expect((document.querySelector(".nav-button") as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector(".mermaid-overlay")).toBeNull();

    (document.querySelector(".mermaid-block") as HTMLElement).click();
    expect(document.querySelector(".mermaid-overlay")).not.toBeNull();
    expect(document.querySelector(".mermaid-overlay svg")).not.toBeNull();

    (document.querySelector(".mermaid-overlay-close") as HTMLButtonElement).click();
    expect(document.querySelector(".mermaid-overlay")).toBeNull();

    const mermaidBlock = document.querySelector(".mermaid-block") as HTMLElement;
    mermaidBlock.focus();
    mermaidBlock.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(document.querySelector(".mermaid-overlay")).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector(".mermaid-overlay")).toBeNull();

    (document.querySelector(".mermaid-block a") as SVGElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.querySelector(".mermaid-overlay")).toBeNull();

    (document.querySelector(".mermaid-block") as HTMLElement).click();
    (document.querySelector(".mermaid-overlay") as HTMLElement).click();
    expect(document.querySelector(".mermaid-overlay")).toBeNull();

    scrollTo.mockClear();
    (document.querySelector(".nav-button.primary") as HTMLButtonElement).click();
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await flushUi();

    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 });
    expect(document.title).toBe("[S02/02]");
    expect(document.querySelector(".stage-heading h1")?.textContent).toBe("Next Step");
    expect(document.querySelector(".slide-ascii")).toBeNull();
    expect(document.querySelector(".stage-summary")).toBeNull();
    expect(document.querySelector(".mermaid-overlay")).toBeNull();
    expect((document.querySelector(".nav-button.primary") as HTMLButtonElement).disabled).toBe(true);
  });

  it("restores the selected slide from the hash", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    window.location.hash = "#/topic/0-demo/slide/1";

    createPresentationApp({
      root: document.querySelector("#root") as HTMLElement,
      manifest
    });

    await flushUi();

    expect(document.querySelector(".stage-heading h1")?.textContent).toBe("Next Step");
    expect(document.title).toBe("[S02/02]");
  });
});
