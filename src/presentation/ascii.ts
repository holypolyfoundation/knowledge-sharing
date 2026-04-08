import type { AsciiScenario } from "../content/slide-schema.ts";

interface AsciiMeta {
  topicTitle: string;
  slideTitle: string;
  summary: string;
  slideId: number;
  slideNumber: number;
}

interface ScenarioContext {
  columns: number;
  frame: number;
  seed: number;
}

const ASCII_ROWS = 3;
const ASCII_FPS = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(input: string): number {
  let hash = 2166136261;

  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createBlankRows(columns: number): string[][] {
  return Array.from({ length: ASCII_ROWS }, () => Array.from({ length: columns }, () => " "));
}

function createFilledRows(columns: number, glyphs: [string, string, string]): string[][] {
  return glyphs.map((glyph) => Array.from({ length: columns }, () => glyph));
}

function normalizeColumns(columns: number): number {
  return clamp(columns, 24, 180);
}

function stamp(rows: string[][], row: number, column: number, text: string): void {
  if (row < 0 || row >= rows.length) {
    return;
  }

  for (let index = 0; index < text.length; index += 1) {
    const nextColumn = column + index;

    if (nextColumn < 0 || nextColumn >= rows[row].length) {
      continue;
    }

    rows[row][nextColumn] = text[index];
  }
}

function renderRows(rows: string[][]): string {
  return rows.map((row) => row.join("")).join("\n");
}

function rotateRight(text: string, offset: number): string {
  if (text.length === 0) {
    return text;
  }

  const normalizedOffset = ((offset % text.length) + text.length) % text.length;

  if (normalizedOffset === 0) {
    return text;
  }

  return text.slice(-normalizedOffset) + text.slice(0, -normalizedOffset);
}

function buildMachineCodeRow(columns: number, row: number, seed: number): string {
  let state = hashSeed(`${seed}|machine-code|${row}`) || 1;
  let bits = "";

  while (bits.length < columns) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    bits += state.toString(2).padStart(32, "0");
  }

  return bits.slice(0, columns);
}

function fireFlicker(seed: number, row: number, column: number, frame: number): number {
  const raw = hashSeed(`${seed}|fire|${row}|${column}|${frame}`);
  return raw / 4294967295;
}

function pickFireGlyph(row: number, intensity: number, draft: number): string {
  if (row === 2) {
    const bed = [".", ":", ";", "!", "i", "I", "H", "M", "#", "%", "@"] as const;
    return bed[Math.min(bed.length - 1, Math.floor(intensity * bed.length))] ?? "@";
  }

  if (row === 1 && intensity > 0.62) {
    if (draft > 0.24) {
      return "/";
    }

    if (draft < -0.24) {
      return "\\";
    }
  }

  if (row === 0 && intensity > 0.72) {
    if (draft > 0.18) {
      return "/";
    }

    if (draft < -0.18) {
      return "\\";
    }
  }

  const plume = row === 0
    ? [" ", " ", ".", "'", "`", "^", "*"]
    : [" ", ".", ":", "!", "i", "*", "%"];

  return plume[Math.min(plume.length - 1, Math.floor(intensity * plume.length))] ?? plume[plume.length - 1];
}

function renderFireFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns);
  const time = context.frame / ASCII_FPS;
  const phase = ((context.seed % 4096) / 4096) * Math.PI * 2;

  for (let column = 0; column < context.columns; column += 1) {
    const x = column / Math.max(5, context.columns / 11);
    const slowWave = Math.sin(x * 0.9 - time * 1.6 + phase);
    const mediumWave = Math.sin(x * 1.8 + time * 2.3 + phase * 0.7);
    const fastWave = Math.sin(x * 3.7 - time * 4.1 + phase * 1.3);
    const draft = clamp(slowWave * 0.58 + mediumWave * 0.28 + fastWave * 0.14, -1, 1);
    const baseHeat = clamp(
      0.56 + slowWave * 0.2 + mediumWave * 0.16 + fastWave * 0.08 + (fireFlicker(context.seed, 3, column, Math.floor(context.frame / 2)) - 0.5) * 0.18,
      0,
      1
    );

    for (let row = 0; row < ASCII_ROWS; row += 1) {
      const rowBoost = [-0.26, 0.06, 0.34][row] ?? 0;
      const rowFlicker = (fireFlicker(context.seed, row, column, context.frame) - 0.5) * 0.16;
      const intensity = clamp(baseHeat + rowBoost + rowFlicker + Math.max(0, slowWave) * 0.06, 0, 1);
      rows[row][column] = pickFireGlyph(row, intensity, draft);
    }
  }

  const sparkCount = Math.max(2, Math.floor(context.columns / 18));

  for (let index = 0; index < sparkCount; index += 1) {
    const cadence = 12 + (index % 5) * 3;
    const sparkFrame = context.frame + index * 7 + (context.seed % 9);
    const age = sparkFrame % cadence;

    if (age > 2) {
      continue;
    }

    const cycle = Math.floor(sparkFrame / cadence);
    const origin = hashSeed(`${context.seed}|spark|${index}|${cycle}`) % context.columns;
    const direction = (hashSeed(`${context.seed}|spark-drift|${index}|${cycle}`) & 1) === 0 ? -1 : 1;
    const row = 2 - age;
    const column = (origin + direction * age + context.columns) % context.columns;
    rows[row][column] = row === 0 ? "'" : row === 1 ? "*" : ".";
  }

  return renderRows(rows);
}

const TERMINAL_LINES = [
  "> pnpm test",
  "ok 63 passed",
  "> pnpm build",
  "dist ready",
  "> pnpm validate",
  "1 topic valid",
  "> git status",
  "clean working tree",
  "> pnpm ascii terminal",
  "seed updated"
] as const;

function renderTerminalFrame(context: ScenarioContext): string {
  const rows = createFilledRows(context.columns, [" ", " ", " "]);
  const holdFrames = 5;
  const stepFrames = 1;
  const durations = TERMINAL_LINES.map((line) => line.length * stepFrames + holdFrames);
  const cycleDuration = durations.reduce((sum, value) => sum + value, 0);
  const absoluteFrame = context.frame + (context.seed % cycleDuration);
  const cyclesCompleted = Math.floor(absoluteFrame / cycleDuration);
  let localFrame = absoluteFrame % cycleDuration;
  let lineIndex = 0;
  let lineFrame = 0;
  let completedInCycle = 0;

  for (let index = 0; index < durations.length; index += 1) {
    if (localFrame < durations[index]) {
      lineIndex = index;
      lineFrame = localFrame;
      break;
    }

    localFrame -= durations[index];
    completedInCycle += 1;
  }

  const totalCompleted = cyclesCompleted * TERMINAL_LINES.length + completedInCycle;
  const visibleIndexes = [totalCompleted - 2, totalCompleted - 1, totalCompleted];
  const activeLine = TERMINAL_LINES[lineIndex] ?? TERMINAL_LINES[0];
  const typedChars = Math.min(activeLine.length, Math.floor(lineFrame / stepFrames));
  const isHolding = lineFrame >= activeLine.length * stepFrames;
  const cursor = isHolding ? " " : lineFrame % 2 === 0 ? "_" : " ";
  const activeVisible = `${activeLine.slice(0, typedChars)}${cursor}`.slice(0, context.columns).padEnd(context.columns, " ");

  for (let row = 0; row < 2; row += 1) {
    const absoluteIndex = visibleIndexes[row];

    if (absoluteIndex < 0) {
      continue;
    }

    const line = TERMINAL_LINES[absoluteIndex % TERMINAL_LINES.length] ?? "";
    stamp(rows, row, 0, line.slice(0, context.columns).padEnd(context.columns, " "));
  }

  stamp(rows, 2, 0, activeVisible);

  return renderRows(rows);
}

function createEmptyLifeState(columns: number): boolean[][] {
  return Array.from({ length: ASCII_ROWS }, () => Array.from({ length: columns }, () => false));
}

function cloneLifeState(rows: boolean[][]): boolean[][] {
  return rows.map((row) => [...row]);
}

function hasLiveCells(rows: boolean[][]): boolean {
  return rows.some((row) => row.some(Boolean));
}

function lifeStatesEqual(left: boolean[][], right: boolean[][]): boolean {
  return left.every((row, rowIndex) => row.every((cell, columnIndex) => cell === right[rowIndex]?.[columnIndex]));
}

function serializeLifeState(rows: boolean[][]): string {
  return rows.map((row) => row.map((cell) => (cell ? "1" : "0")).join("")).join("|");
}

function buildInitialLifeState(columns: number, seed: number, epoch: number): boolean[][] {
  const epochSeed = hashSeed(`${seed}|life-epoch|${epoch}`);
  const rows = Array.from({ length: ASCII_ROWS }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const noise = hashSeed(`${epochSeed}|life|${row}|${column}`);
      const horizontalWeight = Math.sin((column / Math.max(6, columns / 5)) + ((epochSeed % 1024) / 1024) * Math.PI * 2);
      const threshold = column > 1 && column < columns - 2 ? (horizontalWeight > 0 ? 4 : 3) : 2;
      return (noise & 7) < threshold;
    })
  );

  const patternCount = Math.max(3, Math.floor(columns / 18));

  for (let index = 0; index < patternCount; index += 1) {
    const anchor = 2 + ((index * Math.max(7, Math.floor(columns / patternCount))) + (epochSeed % 11)) % Math.max(3, columns - 4);
    const style = hashSeed(`${epochSeed}|life-pattern|${index}`) % 3;

    switch (style) {
      case 0:
        rows[0][anchor - 1] = true;
        rows[1][anchor] = true;
        rows[2][anchor - 1] = true;
        rows[2][anchor] = true;
        rows[2][anchor + 1] = true;
        break;
      case 1:
        rows[0][anchor] = true;
        rows[0][anchor + 1] = true;
        rows[1][anchor - 1] = true;
        rows[1][anchor] = true;
        rows[2][anchor] = true;
        rows[2][anchor + 1] = true;
        break;
      default:
        rows[0][anchor - 1] = true;
        rows[0][anchor + 1] = true;
        rows[1][anchor - 1] = true;
        rows[1][anchor] = true;
        rows[1][anchor + 1] = true;
        rows[2][anchor] = true;
        break;
    }
  }

  return rows;
}

function evolveLifeState(current: boolean[][], columns: number): boolean[][] {
  const next = createEmptyLifeState(columns);

  for (let row = 0; row < ASCII_ROWS; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let neighbors = 0;

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) {
            continue;
          }

          const nextRow = row + rowOffset;
          const nextColumn = column + columnOffset;

          if (nextRow < 0 || nextRow >= ASCII_ROWS || nextColumn < 0 || nextColumn >= columns) {
            continue;
          }

          if (current[nextRow]?.[nextColumn]) {
            neighbors += 1;
          }
        }
      }

      next[row][column] = current[row][column] ? neighbors === 2 || neighbors === 3 : neighbors === 3;
    }
  }

  return next;
}

function buildLifeGeneration(columns: number, seed: number, generation: number): { previous: boolean[][]; current: boolean[][] } {
  let epoch = 0;
  let previous = createEmptyLifeState(columns);
  let current = buildInitialLifeState(columns, seed, epoch);
  let seenStates = new Set([serializeLifeState(current)]);

  if (generation === 0) {
    return {
      previous,
      current
    };
  }

  for (let step = 0; step < generation; step += 1) {
    const next = evolveLifeState(current, columns);
    const nextSignature = serializeLifeState(next);

    if (!hasLiveCells(next) || lifeStatesEqual(next, current) || seenStates.has(nextSignature)) {
      epoch += 1;
      previous = createEmptyLifeState(columns);
      current = buildInitialLifeState(columns, seed, epoch);
      seenStates = new Set([serializeLifeState(current)]);
      continue;
    }

    previous = cloneLifeState(current);
    current = next;
    seenStates.add(nextSignature);
  }

  return {
    previous,
    current
  };
}

function renderGameOfLifeFrame(context: ScenarioContext): string {
  const generation = Math.floor(context.frame / 2);
  const state = buildLifeGeneration(context.columns, context.seed, generation);
  const rows = createFilledRows(context.columns, [".", ".", "."]);

  for (let row = 0; row < ASCII_ROWS; row += 1) {
    for (let column = 0; column < context.columns; column += 1) {
      if (state.current[row][column]) {
        rows[row][column] = state.previous[row][column] ? "O" : "o";
      } else if (state.previous[row][column]) {
        rows[row][column] = "+";
      }
    }
  }

  return renderRows(rows);
}

function renderZeroOneFrame(context: ScenarioContext): string {
  const shift = Math.floor(context.frame / ASCII_FPS);
  const rows = Array.from({ length: ASCII_ROWS }, (_, row) => {
    const baseRow = buildMachineCodeRow(context.columns, row, context.seed);
    return rotateRight(baseRow, shift);
  });

  return rows.join("\n");
}

function buildScenarioSeed(meta: AsciiMeta, scenario: AsciiScenario): number {
  return hashSeed(`${scenario}|${meta.topicTitle}|${meta.slideTitle}|${meta.slideId}|${meta.slideNumber}`);
}

function renderScenarioFrame(scenario: AsciiScenario, columns: number, frame: number, meta: AsciiMeta): string {
  const normalizedColumns = normalizeColumns(columns);
  const context: ScenarioContext = {
    columns: normalizedColumns,
    frame,
    seed: buildScenarioSeed(meta, scenario)
  };

  switch (scenario) {
    case "zero-one":
      return renderZeroOneFrame(context);
    case "fire":
      return renderFireFrame(context);
    case "terminal":
      return renderTerminalFrame(context);
    case "game-of-life":
      return renderGameOfLifeFrame(context);
  }
}

function createAsciiPanel(container: HTMLElement): HTMLPreElement {
  container.innerHTML = `
    <div class="slide-ascii-panel">
      <pre></pre>
      <div class="slide-ascii-overlay" aria-hidden="true"></div>
    </div>
  `;

  return container.querySelector("pre") as HTMLPreElement;
}

function measureCharacterWidth(element: HTMLElement): number {
  const probe = document.createElement("span");
  probe.className = "slide-ascii-measure";
  probe.textContent = "0".repeat(64);
  element.append(probe);
  const width = probe.getBoundingClientRect().width / 64;
  probe.remove();
  return width || 7.2;
}

export function renderAsciiPreview(scenario: AsciiScenario, meta: Partial<AsciiMeta> = {}, columns = 72, frame = 0): string {
  const resolvedMeta: AsciiMeta = {
    topicTitle: "Topic",
    slideTitle: "Slide",
    summary: "Animated ASCII",
    slideId: 0,
    slideNumber: 1,
    ...meta
  };

  return renderScenarioFrame(scenario, columns, frame, resolvedMeta);
}

export function mountAsciiAnimation(container: HTMLElement, scenario: AsciiScenario, meta: AsciiMeta): () => void {
  const pre = createAsciiPanel(container);
  const charWidth = measureCharacterWidth(pre);
  let frame = 0;
  let rafId = 0;
  let lastFrameMs = 0;
  let visible = true;

  const render = () => {
    const panelWidth = pre.parentElement?.clientWidth ?? pre.clientWidth ?? container.clientWidth;
    const columns = Math.max(24, Math.floor(panelWidth / charWidth));
    pre.textContent = renderScenarioFrame(scenario, columns, frame, meta);
    frame += 1;
  };

  render();

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          render();
        });
  resizeObserver?.observe(container);

  const intersectionObserver =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;

          if (visible) {
            render();
          }
        }, { rootMargin: "120px" });
  intersectionObserver?.observe(container);

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  if (!prefersReducedMotion) {
    const tick = () => {
      rafId = window.requestAnimationFrame(tick);

      if (!visible) {
        return;
      }

      const now = Date.now();

      if (now - lastFrameMs < 1000 / ASCII_FPS) {
        return;
      }

      lastFrameMs = now;
      render();
    };

    rafId = window.requestAnimationFrame(tick);
  }

  return () => {
    window.cancelAnimationFrame(rafId);
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    container.innerHTML = "";
  };
}
