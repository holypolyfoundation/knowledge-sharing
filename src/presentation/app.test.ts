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
          html: '<div align="center" data-slide-ascii><pre>x</pre></div><h2>Scene</h2><div class="mermaid">graph TD; A-->B;</div>',
          hasMermaid: true
        },
        {
          id: 1,
          slug: "next-step",
          title: "Next Step",
          summary: "Second slide",
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
    expect(document.querySelector(".stage-heading h1")?.textContent).toBe("Intro");
    expect(window.location.hash).toContain("/slide/0");
  });

  it("updates prev and next controls and renders mermaid slides", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const mermaidRender = vi.fn().mockResolvedValue(undefined);
    window.location.hash = "#/topic/0-demo/slide/0";

    createPresentationApp({
      root: document.querySelector("#root") as HTMLElement,
      manifest,
      mermaidAdapter: {
        render: mermaidRender
      }
    });

    await flushUi();
    expect(mermaidRender).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".telemetry-strip")).toBeNull();
    expect(document.querySelector(".system-header")).toBeNull();
    expect(document.querySelector(".slide-stage")).not.toBeNull();
    expect((document.querySelector(".nav-button") as HTMLButtonElement).disabled).toBe(true);

    (document.querySelector(".nav-button.primary") as HTMLButtonElement).click();
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await flushUi();

    expect(document.querySelector(".stage-heading h1")?.textContent).toBe("Next Step");
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
  });
});
