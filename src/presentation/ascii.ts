import { DEFAULT_ASCII_HEIGHT, type AsciiScenario } from "../content/slide-schema.ts";

interface AsciiMeta {
  topicTitle: string;
  slideTitle: string;
  summary: string;
  slideId: number;
  slideNumber: number;
}

interface ScenarioContext {
  columns: number;
  rows: number;
  frame: number;
  seed: number;
}

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

function resolveAsciiHeight(height: number): number {
  return Number.isInteger(height) && height > 0 ? height : DEFAULT_ASCII_HEIGHT;
}

function createBlankRows(columns: number, rows: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => " "));
}

function createFilledRows(columns: number, rows: number, glyphs: readonly string[]): string[][] {
  return Array.from({ length: rows }, (_, row) => {
    const glyph = glyphs[row] ?? glyphs[glyphs.length - 1] ?? " ";
    return Array.from({ length: columns }, () => glyph);
  });
}

function getMaxColumns(rows: number): number {
  return Math.max(180, Math.round(180 / getAsciiRowScale(rows)));
}

function normalizeColumns(columns: number, rows: number): number {
  return clamp(columns, 24, getMaxColumns(rows));
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

function pickFireGlyph(rowProgress: number, intensity: number, draft: number, core: number): string {
  if (intensity < 0.06) {
    return " ";
  }

  if (rowProgress > 0.82) {
    const bed = [".", ":", ";", "!", "i", "I", "H", "M", "#", "%", "@"] as const;
    return bed[Math.min(bed.length - 1, Math.floor((intensity + core * 0.18) * bed.length))] ?? "@";
  }

  if (intensity > 0.56 && core < 0.55) {
    if (draft > 0.24) {
      return "/";
    }

    if (draft < -0.24) {
      return "\\";
    }
  }

  if (rowProgress < 0.35 && intensity > 0.7) {
    if (draft > 0.18) {
      return "/";
    }

    if (draft < -0.18) {
      return "\\";
    }
  }

  if (core > 0.72 && intensity > 0.72) {
    const coreChars = [":", "!", "i", "I", "*", "%", "M", "#", "@"] as const;
    return coreChars[Math.min(coreChars.length - 1, Math.floor(intensity * coreChars.length))] ?? "@";
  }

  const plume = rowProgress < 0.35
    ? [" ", " ", ".", "'", "`", "^", "*"]
    : [" ", ".", ":", "!", "i", "*", "%"];

  return plume[Math.min(plume.length - 1, Math.floor(intensity * plume.length))] ?? plume[plume.length - 1];
}

function renderFireFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const time = context.frame / ASCII_FPS;
  const phase = ((context.seed % 4096) / 4096) * Math.PI * 2;
  const centerBase = (context.columns - 1) / 2 + Math.sin(time * 0.9 + phase) * context.columns * 0.035;

  for (let row = 0; row < context.rows; row += 1) {
    const rowProgress = context.rows === 1 ? 1 : row / (context.rows - 1);
    const lift = 1 - rowProgress;
    const rowWidth = context.columns * (0.09 + Math.pow(rowProgress, 0.92) * 0.31);
    const coreWidth = Math.max(2, rowWidth * (0.24 + rowProgress * 0.12));
    const rowSway = Math.sin(time * 1.3 + row * 0.48 + phase) * context.columns * (0.012 + lift * 0.045);

    for (let column = 0; column < context.columns; column += 1) {
      const x = column / Math.max(5, context.columns / 11);
      const normalizedX = column / Math.max(1, context.columns - 1);
      const slowWave = Math.sin(x * 0.9 - time * 1.6 + phase);
      const mediumWave = Math.sin(x * 1.8 + time * 2.3 + phase * 0.7);
      const fastWave = Math.sin(x * 3.7 - time * 4.1 + phase * 1.3);
      const draft = clamp(slowWave * 0.56 + mediumWave * 0.29 + fastWave * 0.15, -1, 1);
      const center = centerBase + draft * lift * context.columns * 0.12 + rowSway;
      const distance = Math.abs(column - center);
      const envelope = clamp(1 - distance / rowWidth, 0, 1);
      const core = clamp(1 - distance / coreWidth, 0, 1);
      const tongue = Math.sin(normalizedX * 18 - time * 4.4 + row * 0.68 + phase) * 0.18
        + Math.sin(normalizedX * 34 + time * 2.6 - row * 0.35 + phase * 1.7) * 0.1
        + (fireFlicker(context.seed, row, column, context.frame) - 0.5) * 0.18;
      const bedHeat = rowProgress > 0.84
        ? 0.42 + Math.max(0, envelope) * 0.32 + (fireFlicker(context.seed, context.rows + 1, column, Math.floor(context.frame / 2)) - 0.5) * 0.1
        : 0;
      const verticalHeat = Math.pow(rowProgress, 0.65);
      const intensity = clamp(
        bedHeat
          + verticalHeat * 0.34
          + envelope * 0.5
          + core * 0.34
          + tongue
          + Math.max(0, slowWave) * 0.05,
        0,
        1
      );

      rows[row][column] = pickFireGlyph(rowProgress, intensity, draft, core);
    }
  }

  const sparkCount = Math.max(2, Math.floor(context.columns / 18));
  const maxSparkRise = Math.min(Math.max(2, context.rows - 1), 5);

  for (let index = 0; index < sparkCount; index += 1) {
    const cadence = 12 + (index % 5) * 3;
    const sparkFrame = context.frame + index * 7 + (context.seed % 9);
    const age = sparkFrame % cadence;

    if (age > maxSparkRise) {
      continue;
    }

    const cycle = Math.floor(sparkFrame / cadence);
    const origin = hashSeed(`${context.seed}|spark|${index}|${cycle}`) % context.columns;
    const direction = (hashSeed(`${context.seed}|spark-drift|${index}|${cycle}`) & 1) === 0 ? -1 : 1;
    const row = context.rows - 1 - age;
    const column = (origin + direction * age + context.columns) % context.columns;

    if (row >= 0) {
      rows[row][column] = age >= maxSparkRise ? "'" : age === 0 ? "." : age < 3 ? "*" : ":";
    }
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
  const rows = createBlankRows(context.columns, context.rows);
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
  const activeLine = TERMINAL_LINES[lineIndex] ?? TERMINAL_LINES[0];
  const typedChars = Math.min(activeLine.length, Math.floor(lineFrame / stepFrames));
  const isHolding = lineFrame >= activeLine.length * stepFrames;
  const cursor = isHolding ? " " : lineFrame % 2 === 0 ? "_" : " ";
  const activeVisible = `${activeLine.slice(0, typedChars)}${cursor}`.slice(0, context.columns).padEnd(context.columns, " ");
  const completedLineCount = Math.max(0, context.rows - 1);

  for (let row = 0; row < completedLineCount; row += 1) {
    const absoluteIndex = totalCompleted - (completedLineCount - row);

    if (absoluteIndex >= 0) {
      const line = TERMINAL_LINES[absoluteIndex % TERMINAL_LINES.length] ?? "";
      stamp(rows, row, 0, line.slice(0, context.columns).padEnd(context.columns, " "));
    }
  }

  stamp(rows, context.rows - 1, 0, activeVisible);

  return renderRows(rows);
}

function createEmptyLifeState(columns: number, rows: number): boolean[][] {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => false));
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

function stampLifePattern(rows: boolean[][], anchorRow: number, anchorColumn: number, points: Array<[number, number]>): void {
  const rowCount = rows.length;

  for (const [rowOffset, columnOffset] of points) {
    const row = clamp(anchorRow + rowOffset, 0, rowCount - 1);
    const column = clamp(anchorColumn + columnOffset, 0, rows[0].length - 1);
    rows[row][column] = true;
  }
}

function buildInitialLifeState(columns: number, rowCount: number, seed: number, epoch: number): boolean[][] {
  const epochSeed = hashSeed(`${seed}|life-epoch|${epoch}`);
  const rows = Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const noise = hashSeed(`${epochSeed}|life|${row}|${column}`);
      const horizontalWeight = Math.sin((column / Math.max(6, columns / 5)) + ((epochSeed % 1024) / 1024) * Math.PI * 2);
      const threshold = column > 1 && column < columns - 2 ? (horizontalWeight > 0 ? 4 : 3) : 2;
      return (noise & 7) < threshold;
    })
  );

  const patternCount = Math.max(3, Math.floor(columns / 18));
  const patterns: Array<Array<[number, number]>> = [
    [[-1, -1], [0, 0], [1, -1], [1, 0], [1, 1]],
    [[-1, 0], [-1, 1], [0, -1], [0, 0], [1, 0], [1, 1]],
    [[-1, -1], [-1, 1], [0, -1], [0, 0], [0, 1], [1, 0]]
  ];

  for (let index = 0; index < patternCount; index += 1) {
    const anchor = 2 + ((index * Math.max(7, Math.floor(columns / patternCount))) + (epochSeed % 11)) % Math.max(3, columns - 4);
    const style = hashSeed(`${epochSeed}|life-pattern|${index}`) % patterns.length;
    const anchorRow = rowCount === 1 ? 0 : Math.min(rowCount - 1, 1 + (index % Math.max(1, rowCount - 1)));
    stampLifePattern(rows, anchorRow, anchor, patterns[style] ?? patterns[0]);
  }

  return rows;
}

function evolveLifeState(current: boolean[][], columns: number): boolean[][] {
  const rowCount = current.length;
  const next = createEmptyLifeState(columns, rowCount);

  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let neighbors = 0;

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) {
            continue;
          }

          const nextRow = row + rowOffset;
          const nextColumn = column + columnOffset;

          if (nextRow < 0 || nextRow >= rowCount || nextColumn < 0 || nextColumn >= columns) {
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

function buildLifeGeneration(columns: number, rowCount: number, seed: number, generation: number): { previous: boolean[][]; current: boolean[][] } {
  let epoch = 0;
  let previous = createEmptyLifeState(columns, rowCount);
  let current = buildInitialLifeState(columns, rowCount, seed, epoch);
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
      previous = createEmptyLifeState(columns, rowCount);
      current = buildInitialLifeState(columns, rowCount, seed, epoch);
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
  const state = buildLifeGeneration(context.columns, context.rows, context.seed, generation);
  const rows = createFilledRows(context.columns, context.rows, ["."]);

  for (let row = 0; row < context.rows; row += 1) {
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
  const rows = Array.from({ length: context.rows }, (_, row) => {
    const baseRow = buildMachineCodeRow(context.columns, row, context.seed);
    return rotateRight(baseRow, shift);
  });

  return rows.join("\n");
}

function buildScenarioSeed(meta: AsciiMeta, scenario: AsciiScenario): number {
  return hashSeed(`${scenario}|${meta.topicTitle}|${meta.slideTitle}|${meta.slideId}|${meta.slideNumber}`);
}

function renderScenarioFrame(scenario: AsciiScenario, columns: number, rows: number, frame: number, meta: AsciiMeta): string {
  const normalizedRows = resolveAsciiHeight(rows);
  const normalizedColumns = normalizeColumns(columns, normalizedRows);
  const context: ScenarioContext = {
    columns: normalizedColumns,
    rows: normalizedRows,
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

export function getAsciiRowScale(rows: number): number {
  return DEFAULT_ASCII_HEIGHT / resolveAsciiHeight(rows);
}

export function getAsciiBlockHeight(rows: number, baseFontSizePx = 11, lineHeight = 1.55): number {
  const normalizedRows = resolveAsciiHeight(rows);
  return normalizedRows * lineHeight * baseFontSizePx * getAsciiRowScale(normalizedRows);
}

export function renderAsciiPreview(
  scenario: AsciiScenario,
  meta: Partial<AsciiMeta> = {},
  columns = 72,
  frame = 0,
  rows = DEFAULT_ASCII_HEIGHT
): string {
  const resolvedMeta: AsciiMeta = {
    topicTitle: "Topic",
    slideTitle: "Slide",
    summary: "Animated ASCII",
    slideId: 0,
    slideNumber: 1,
    ...meta
  };

  return renderScenarioFrame(scenario, columns, rows, frame, resolvedMeta);
}

export function mountAsciiAnimation(container: HTMLElement, scenario: AsciiScenario, meta: AsciiMeta, rows = DEFAULT_ASCII_HEIGHT): () => void {
  const asciiHeight = resolveAsciiHeight(rows);
  container.style.setProperty("--ascii-rows", String(asciiHeight));
  const pre = createAsciiPanel(container);
  const charWidth = measureCharacterWidth(pre);
  let frame = 0;
  let rafId = 0;
  let lastFrameMs = 0;
  let visible = true;

  const render = () => {
    const panelWidth = pre.parentElement?.clientWidth ?? pre.clientWidth ?? container.clientWidth;
    const columns = Math.max(24, Math.floor(panelWidth / charWidth));
    pre.textContent = renderScenarioFrame(scenario, columns, asciiHeight, frame, meta);
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
