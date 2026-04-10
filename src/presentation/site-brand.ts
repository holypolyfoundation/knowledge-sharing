/**
 * Browser tab titles: symbols only (no words). Injected into index.html via Vite (see vite.config.ts).
 */
export const SITE_DOCUMENT_TITLE_DEFAULT = "[]";

/**
 * Noise for unrevealed suffix — same palette as slide ASCII (fire, radar, equalizer, etc.).
 */
const DECODE_NOISE = ["#", ":", "*", "+", "=", ".", "-"] as const;

const TICK_MS = 80;

function isDocumentTitleAnimationDisabled(): boolean {
  return Boolean(import.meta.env.VITEST);
}

export function formatTopicListDocumentTitle(topicCount: number): string {
  const n = String(topicCount).padStart(2, "0");
  return `[${n}]`;
}

export function formatSlideDocumentTitle(slideId: number, totalSlides: number): string {
  const slideCode = `S${String(slideId + 1).padStart(2, "0")}`;
  const denom = String(totalSlides).padStart(2, "0");
  return `[${slideCode}/${denom}]`;
}

function decodeNoise(position: number, noiseFrame: number): string {
  const index = ((position * 31 + noiseFrame * 17 + 7) >>> 0) % DECODE_NOISE.length;
  return DECODE_NOISE[index]!;
}

/** Prefix of `target` up to `revealedCount`, rest filled with animated noise. */
function buildPartialTitle(target: string, revealedCount: number, noiseFrame: number): string {
  let result = "";

  for (let i = 0; i < target.length; i += 1) {
    result += i < revealedCount ? target[i]! : decodeNoise(i, noiseFrame);
  }

  return result;
}

/**
 * One-shot typewriter when the route changes: reveal left-to-right with a noise suffix,
 * then leave the final title static (no backward loop, no repeat).
 */
function attachAnimatedDocumentTitle(base: string): () => void {
  if (isDocumentTitleAnimationDisabled()) {
    document.title = base;
    return () => {};
  }

  const n = base.length;
  let tick = -1;
  let noiseFrame = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const update = () => {
    tick += 1;
    noiseFrame += 1;
    const revealed = tick + 1;

    if (revealed >= n) {
      document.title = base;

      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }

      return;
    }

    document.title = buildPartialTitle(base, revealed, noiseFrame);
  };

  noiseFrame = 0;
  update();

  if (tick + 1 < n) {
    intervalId = window.setInterval(update, TICK_MS);
  }

  return () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
    }
  };
}

export function attachAnimatedTopicListDocumentTitle(topicCount: number): () => void {
  return attachAnimatedDocumentTitle(formatTopicListDocumentTitle(topicCount));
}

export function attachAnimatedSlideDocumentTitle(slideId: number, totalSlides: number): () => void {
  return attachAnimatedDocumentTitle(formatSlideDocumentTitle(slideId, totalSlides));
}
