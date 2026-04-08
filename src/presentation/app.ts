import type { PresentationManifest, TopicManifest } from "../content/load-topics.ts";

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

export function createPresentationApp(options: {
  root: HTMLElement;
  manifest: PresentationManifest;
  mermaidAdapter?: MermaidAdapter;
}): { destroy: () => void } {
  const { root, manifest, mermaidAdapter } = options;

  const render = async (): Promise<void> => {
    root.innerHTML = "";
    const route = parseHash(window.location.hash);
    const topic = findTopic(manifest, route.topicSlug);

    if (!topic || topic.slides.length === 0) {
      renderTopicList(root, manifest);
      return;
    }

    const slide = topic.slides.find((item) => item.id === route.slideId) ?? topic.slides[0];
    const slideIndex = topic.slides.findIndex((item) => item.id === slide.id);
    const previousSlide = slideIndex > 0 ? topic.slides[slideIndex - 1] : null;
    const nextSlide = slideIndex < topic.slides.length - 1 ? topic.slides[slideIndex + 1] : null;

    root.append(renderSlideView(topic, slideIndex + 1, slide, previousSlide?.id ?? null, nextSlide?.id ?? null));
    const slideBody = root.querySelector<HTMLElement>(".slide-body");

    if (slideBody && slide.hasMermaid && mermaidAdapter) {
      await mermaidAdapter.render(slideBody);
    }
  };

  const handleHashChange = () => {
    void render();
  };

  window.addEventListener("hashchange", handleHashChange);
  void render();

  return {
    destroy: () => {
      window.removeEventListener("hashchange", handleHashChange);
      root.innerHTML = "";
    }
  };
}

function renderTopicList(root: HTMLElement, manifest: PresentationManifest): void {
  const shell = document.createElement("main");
  shell.className = "app-shell topic-shell";
  shell.innerHTML = ``;

  const topicGrid = document.createElement("section");
  topicGrid.className = "topic-grid";

  for (const topic of manifest.topics) {
    const firstSlide = topic.slides[0];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "topic-card";
    card.innerHTML = `
      <span class="topic-number">${String(topic.id).padStart(2, "0")}</span>
      <h2>${topic.title}</h2>
      <p>${firstSlide?.summary ?? "Open the first slide in this topic."}</p>
      <span class="topic-meta">${topic.slides.length} slides</span>
    `;
    card.addEventListener("click", () => {
      window.location.hash = buildHash(topic, firstSlide?.id ?? 0);
    });
    topicGrid.append(card);
  }

  shell.append(topicGrid);
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

  const header = document.createElement("header");
  header.className = "slide-header";
  header.append(
    createButton("All topics", "ghost-button", () => {
      window.location.hash = "";
    })
  );

  const headerMeta = document.createElement("div");
  headerMeta.className = "slide-meta";
  headerMeta.innerHTML = `
    <p class="eyebrow">${topic.title}</p>
    <h1>${slide.title}</h1>
    <p class="slide-summary">${slide.summary}</p>
  `;
  header.append(headerMeta);
  shell.append(header);

  const article = document.createElement("article");
  article.className = "slide-article";
  article.innerHTML = `
    <div class="slide-kicker">
      <span>Slide ${slideNumber}</span>
      <span>${topic.slides.length} total</span>
    </div>
    <div class="slide-body">${slide.html}</div>
  `;
  shell.append(article);

  const controls = document.createElement("nav");
  controls.className = "slide-controls";
  controls.setAttribute("aria-label", "Slide navigation");
  controls.append(
    createButton(
      "Previous",
      "nav-button",
      () => {
        if (previousSlideId !== null) {
          window.location.hash = buildHash(topic, previousSlideId);
        }
      },
      previousSlideId === null
    )
  );
  controls.append(
    createButton(
      "Next",
      "nav-button primary",
      () => {
        if (nextSlideId !== null) {
          window.location.hash = buildHash(topic, nextSlideId);
        }
      },
      nextSlideId === null
    )
  );
  shell.append(controls);

  return shell;
}
