import type { PresentationManifest, TopicManifest } from "../content/load-topics.ts";
import { mountAsciiAnimation } from "./ascii.ts";
import {
  SITE_DOCUMENT_TITLE_DEFAULT,
  attachAnimatedSlideDocumentTitle,
  attachAnimatedTopicListDocumentTitle
} from "./site-brand.ts";

export interface MermaidAdapter {
  render(container: HTMLElement): Promise<void>;
}

interface RouteState {
  topicSlug: string | null;
  slideId: number | null;
}

function parseHash(hash: string): RouteState {
  const cleaned = hash.replace(/^#\/?/, "");

  if (cleaned.length === 0) {
    return {
      topicSlug: null,
      slideId: null
    };
  }

  const parts = cleaned.split("/");

  if (parts.length !== 4 || parts[0] !== "topic" || parts[2] !== "slide") {
    return {
      topicSlug: null,
      slideId: null
    };
  }

  const slideId = Number.parseInt(parts[3], 10);

  return {
    topicSlug: parts[1] || null,
    slideId: Number.isNaN(slideId) ? null : slideId
  };
}

function buildHash(topic: TopicManifest, slideId: number): string {
  return `#/topic/${topic.id}-${topic.slug}/slide/${slideId}`;
}

function findTopic(manifest: PresentationManifest, topicSlug: string | null): TopicManifest | null {
  if (!topicSlug) {
    return null;
  }

  return manifest.topics.find((topic) => `${topic.id}-${topic.slug}` === topicSlug) ?? null;
}

function createButton(label: string, className: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function formatCode(prefix: string, numericId: number): string {
  return `${prefix}${String(numericId + 1).padStart(2, "0")}`;
}

function scrollToTop(): void {
  window.scrollTo({ left: 0, top: 0 });
}

export function createPresentationApp(options: {
  root: HTMLElement;
  manifest: PresentationManifest;
  mermaidAdapter?: MermaidAdapter;
}): { destroy: () => void } {
  const { root, manifest, mermaidAdapter } = options;
  let cleanupAscii = () => {};
  let cleanupMermaidInteractions = () => {};
  let cleanupDocumentTitle = () => {};

  const render = async (): Promise<void> => {
    cleanupAscii();
    cleanupAscii = () => {};
    cleanupMermaidInteractions();
    cleanupMermaidInteractions = () => {};
    cleanupDocumentTitle();
    cleanupDocumentTitle = () => {};
    root.innerHTML = "";
    const route = parseHash(window.location.hash);
    const topic = findTopic(manifest, route.topicSlug);

    if (!topic || topic.slides.length === 0) {
      cleanupDocumentTitle = attachAnimatedTopicListDocumentTitle(manifest.topics.length);
      renderTopicList(root, manifest);
      return;
    }

    const slide = topic.slides.find((item) => item.id === route.slideId) ?? topic.slides[0];
    const slideIndex = topic.slides.findIndex((item) => item.id === slide.id);
    const currentSlideNumber = slideIndex + 1;
    cleanupDocumentTitle = attachAnimatedSlideDocumentTitle(slide.id, topic.slides.length);
    const previousSlide = slideIndex > 0 ? topic.slides[slideIndex - 1] : null;
    const nextSlide = slideIndex < topic.slides.length - 1 ? topic.slides[slideIndex + 1] : null;

    root.append(renderSlideView(topic, currentSlideNumber, slide, previousSlide?.id ?? null, nextSlide?.id ?? null));
    const asciiRoot = root.querySelector<HTMLElement>(".slide-ascii");
    const slideBody = root.querySelector<HTMLElement>(".slide-body");

    if (asciiRoot && slide.asciiSeed) {
      cleanupAscii = mountAsciiAnimation(asciiRoot, slide.asciiSeed, {
        topicTitle: topic.title,
        slideTitle: slide.title,
        summary: slide.summary,
        slideId: slide.id,
        slideNumber: currentSlideNumber
      }, slide.asciiHeight);
    }

    if (slideBody && slide.hasMermaid && mermaidAdapter) {
      await mermaidAdapter.render(slideBody);
      cleanupMermaidInteractions = attachMermaidInteractions(slideBody);
    }
  };

  const handleHashChange = () => {
    void render();
  };

  window.addEventListener("hashchange", handleHashChange);
  void render();

  return {
    destroy: () => {
      cleanupAscii();
      cleanupMermaidInteractions();
      cleanupDocumentTitle();
      window.removeEventListener("hashchange", handleHashChange);
      root.innerHTML = "";
      document.title = SITE_DOCUMENT_TITLE_DEFAULT;
    }
  };
}

function attachMermaidInteractions(container: HTMLElement): () => void {
  let overlay: HTMLDivElement | null = null;

  const closeOverlay = () => {
    overlay?.removeEventListener("click", handleOverlayClick);
    overlay?.remove();
    overlay = null;
    document.removeEventListener("keydown", handleDocumentKeydown);
    document.body.classList.remove("mermaid-overlay-open");
  };

  const handleOverlayClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;

    if (!target) {
      return;
    }

    if (target.closest("[data-mermaid-overlay-close]") || target === overlay) {
      closeOverlay();
    }
  };

  const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeOverlay();
    }
  };

  const openOverlay = (block: HTMLElement) => {
    const svg = block.querySelector<SVGElement>("svg");

    if (!svg) {
      return;
    }

    closeOverlay();

    const clonedSvg = svg.cloneNode(true) as SVGElement;
    overlay = document.createElement("div");
    overlay.className = "mermaid-overlay";
    overlay.setAttribute("data-mermaid-overlay", "");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Expanded Mermaid diagram");
    overlay.innerHTML = `
      <div class="mermaid-overlay-panel">
        <div class="mermaid-overlay-header">
          <span class="mermaid-overlay-label">diagram</span>
          <button type="button" class="mermaid-overlay-close" data-mermaid-overlay-close aria-label="Close expanded Mermaid diagram">Close</button>
        </div>
        <div class="mermaid-overlay-canvas" data-mermaid-overlay-canvas></div>
      </div>
    `;
    overlay.querySelector<HTMLElement>("[data-mermaid-overlay-canvas]")?.append(clonedSvg);
    overlay.addEventListener("click", handleOverlayClick);
    document.addEventListener("keydown", handleDocumentKeydown);
    document.body.classList.add("mermaid-overlay-open");
    document.body.append(overlay);
  };

  const isInteractiveMermaidTarget = (target: HTMLElement | null): boolean => {
    if (!target) {
      return false;
    }

    return Boolean(target.closest("a, button, input, select, textarea, summary, [role='button']"));
  };

  const handleContainerClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const block = target?.closest<HTMLElement>("[data-mermaid-block]");

    if (!block || isInteractiveMermaidTarget(target)) {
      return;
    }

    openOverlay(block);
  };

  const handleContainerKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const target = event.target as HTMLElement | null;
    const block = target?.closest<HTMLElement>("[data-mermaid-block]");

    if (!block || target !== block || isInteractiveMermaidTarget(target)) {
      return;
    }

    event.preventDefault();
    openOverlay(block);
  };

  container.addEventListener("click", handleContainerClick);
  container.addEventListener("keydown", handleContainerKeydown);

  return () => {
    closeOverlay();
    container.removeEventListener("click", handleContainerClick);
    container.removeEventListener("keydown", handleContainerKeydown);
  };
}

function renderTopicList(root: HTMLElement, manifest: PresentationManifest): void {
  const shell = document.createElement("main");
  shell.className = "app-shell topic-shell";

  const gridFrame = document.createElement("section");
  gridFrame.className = "topic-grid-frame";
  gridFrame.innerHTML = '<div class="grid-divider" aria-hidden="true"></div>';

  const topicGrid = document.createElement("section");
  topicGrid.className = "topic-grid";
  topicGrid.setAttribute("aria-label", "Topic modules");

  for (const topic of manifest.topics) {
    const firstSlide = topic.slides[0];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "topic-module";
    card.setAttribute("data-topic-code", formatCode("T", topic.id));
    card.innerHTML = `
      <div class="bracket-inner" aria-hidden="true"></div>
      <div class="module-topline">
        <span class="module-code">// ${formatCode("T", topic.id)} //</span>
        <span class="module-state">live</span>
      </div>
      <div class="module-body">
        <h2>${topic.title}</h2>
        <p>${firstSlide?.summary ?? "Open the first slide in this topic."}</p>
      </div>
      <div class="module-footer">
        <span>slides: ${String(topic.slides.length).padStart(2, "0")}</span>
        <span>entry: ${firstSlide ? formatCode("S", firstSlide.id) : "S00"}</span>
      </div>
    `;
    card.addEventListener("click", () => {
      window.location.hash = buildHash(topic, firstSlide?.id ?? 0);
    });
    topicGrid.append(card);
  }

  gridFrame.append(topicGrid);
  shell.append(gridFrame);
  root.append(shell);
}

function renderSlideView(
  topic: TopicManifest,
  slideNumber: number,
  slide: TopicManifest["slides"][number],
  previousSlideId: number | null,
  nextSlideId: number | null
): HTMLElement {
  const shell = document.createElement("main");
  shell.className = "app-shell slide-shell";

  const article = document.createElement("article");
  article.className = "slide-stage";
  const summaryMarkup = slide.summary.length > 0 ? `<p class="stage-summary">${slide.summary}</p>` : "";
  article.innerHTML = `
    <div class="bracket-inner" aria-hidden="true"></div>
    <div class="stage-rails" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div class="stage-header">
      <div class="stage-header-top">
        <div class="slide-kicker">
          <span>${topic.title}</span>
          <span>${formatCode("S", slide.id)} / ${String(topic.slides.length).padStart(2, "0")}</span>
        </div>
      </div>
      <div class="stage-heading">
        <h1>${slide.title}</h1>
        ${summaryMarkup}
      </div>
    </div>
    ${slide.asciiSeed ? `<div class="slide-ascii" data-slide-ascii style="--ascii-rows: ${slide.asciiHeight};"></div>` : ""}
    <div class="slide-body">${slide.html}</div>
  `;
  article.querySelector<HTMLButtonElement>(".system-control")?.addEventListener("click", () => {
    window.location.hash = "";
  });
  shell.append(article);

  const controls = document.createElement("nav");
  controls.className = "slide-controls";
  controls.setAttribute("aria-label", "Slide navigation");
  controls.append(
    createButton(
      "←",
      "nav-button",
      () => {
        if (previousSlideId !== null) {
          scrollToTop();
          window.location.hash = buildHash(topic, previousSlideId);
        }
      },
      previousSlideId === null
    )
  );
  controls.append(
    createButton(
      "→",
      "nav-button primary",
      () => {
        if (nextSlideId !== null) {
          scrollToTop();
          window.location.hash = buildHash(topic, nextSlideId);
        }
      },
      nextSlideId === null
    )
  );
  shell.append(controls);

  return shell;
}
