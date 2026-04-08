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
  meta: AsciiMeta;
}

interface Shot {
  row: number;
  column: number;
}

interface AsteroidState {
  id: number;
  row: number;
  column: number;
  cycle: number;
  speed: number;
}

interface ShipCrashState {
  asteroidId: number;
  frame: number;
  row: number;
  shipX: number;
}

const ASCII_ROWS = 3;
const ASCII_FPS = 12;
const SHOT_LIFETIME_FRAMES = 16;

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

function renderZeroOneFrame(context: ScenarioContext): string {
  const shift = Math.floor(context.frame / ASCII_FPS);
  const rows = Array.from({ length: ASCII_ROWS }, (_, row) => {
    const baseRow = buildMachineCodeRow(context.columns, row, context.seed);
    return rotateRight(baseRow, shift);
  });

  return rows.join("\n");
}

function shipRowAt(frame: number, columns: number, seed: number): number {
  const phase = Math.floor((frame + (seed % 19)) / 10) % 4;

  switch (phase) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    default:
      return 1;
  }
}

function shipXAt(frame: number, columns: number, shipLength: number, seed: number): number {
  const travelWidth = columns + shipLength + 10;
  return ((frame * 2 + (seed % 23)) % travelWidth) - shipLength;
}

function buildShots(frame: number, columns: number, seed: number, shipLength: number): Shot[] {
  const shots: Shot[] = [];

  for (let burst = 0; burst < 2; burst += 1) {
    const offset = burst * 9 + (seed % 7);
    const burstAge = (frame + offset) % 22;

    if (burstAge >= SHOT_LIFETIME_FRAMES) {
      continue;
    }

    const shotRow = shipRowAt(frame - burstAge, columns, seed);
    const shotStart = shipXAt(frame - burstAge, columns, shipLength, seed) + shipLength;

    for (let step = 0; step < 3; step += 1) {
      shots.push({
        row: shotRow,
        column: shotStart + burstAge * 3 + step
      });
    }
  }

  return shots;
}

function buildAsteroidState(index: number, frame: number, columns: number, seed: number): AsteroidState {
  const speed = 1 + ((seed + index) % 2);
  const travelWidth = columns + 8;
  const offset = index * Math.max(8, Math.floor(columns / 3)) + (seed % 11);
  const progress = (frame * speed + offset) % travelWidth;
  const cycle = Math.floor((frame * speed + offset) / travelWidth);
  const column = columns - 1 - progress;
  const row = (seed + index * 5) % ASCII_ROWS;

  return {
    id: index,
    row,
    column,
    cycle,
    speed
  };
}

function findAsteroidHitFrame(asteroid: AsteroidState, context: ScenarioContext, shipLength: number): number | null {
  const cycleSpanFrames = Math.ceil((context.columns + 8) / asteroid.speed);
  const searchStart = Math.max(0, context.frame - cycleSpanFrames - 1);

  for (let frame = searchStart; frame <= context.frame; frame += 1) {
    const candidate = buildAsteroidState(asteroid.id, frame, context.columns, context.seed);

    if (candidate.cycle !== asteroid.cycle) {
      continue;
    }

    const hit = buildShots(frame, context.columns, context.seed, shipLength).find(
      (shot) => shot.row === candidate.row && Math.abs(shot.column - candidate.column) <= 1
    );

    if (hit) {
      return frame;
    }
  }

  return null;
}

function findShipCrashFrame(context: ScenarioContext, shipLength: number): ShipCrashState | null {
  const searchStart = Math.max(0, context.frame - 2);

  for (let frame = searchStart; frame <= context.frame; frame += 1) {
    const shipRow = shipRowAt(frame, context.columns, context.seed);
    const shipX = shipXAt(frame, context.columns, shipLength, context.seed);
    const shipNose = shipX + shipLength - 1;

    for (let asteroidId = 0; asteroidId < 4; asteroidId += 1) {
      const asteroid = buildAsteroidState(asteroidId, frame, context.columns, context.seed);
      const frameContext = { ...context, frame };

      if (findAsteroidHitFrame(asteroid, frameContext, shipLength) !== null) {
        continue;
      }

      if (asteroid.row !== shipRow) {
        continue;
      }

      if (asteroid.column < shipX || asteroid.column > shipNose) {
        continue;
      }

      return {
        asteroidId,
        frame,
        row: shipRow,
        shipX
      };
    }
  }

  return null;
}

function renderSpaceshipFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns);
  const ship = "=^>";
  const shipRow = shipRowAt(context.frame, context.columns, context.seed);
  const shipX = shipXAt(context.frame, context.columns, ship.length, context.seed);
  const shots = buildShots(context.frame, context.columns, context.seed, ship.length);
  const asteroids = Array.from({ length: 4 }, (_, index) => buildAsteroidState(index, context.frame, context.columns, context.seed));
  const shipCrash = findShipCrashFrame(context, ship.length);

  for (const asteroid of asteroids) {
    if (shipCrash !== null && asteroid.id === shipCrash.asteroidId && asteroid.cycle === buildAsteroidState(asteroid.id, shipCrash.frame, context.columns, context.seed).cycle) {
      continue;
    }

    const hitFrame = findAsteroidHitFrame(asteroid, context, ship.length);

    if (hitFrame !== null) {
      const explosionAge = context.frame - hitFrame;

      if (explosionAge <= 2) {
        const explosionGlyph = ["x", "+", "."][explosionAge] ?? ".";
        stamp(rows, asteroid.row, asteroid.column, explosionGlyph);
      }

      continue;
    }

    stamp(rows, asteroid.row, asteroid.column, "*");
  }

  for (const shot of shots) {
    stamp(rows, shot.row, shot.column, "-");
  }

  if (shipCrash !== null) {
    const crashAge = context.frame - shipCrash.frame;
    const crashGlyph = ["XXX", "x+x", " . "][crashAge] ?? "   ";
    stamp(rows, shipCrash.row, shipCrash.shipX, crashGlyph);
  } else {
    stamp(rows, shipRow, shipX, ship);
  }

  return renderRows(rows);
}

function buildScenarioSeed(meta: AsciiMeta, scenario: AsciiScenario): number {
  return hashSeed(`${scenario}|${meta.topicTitle}|${meta.slideTitle}|${meta.slideId}|${meta.slideNumber}`);
}

function renderScenarioFrame(scenario: AsciiScenario, columns: number, frame: number, meta: AsciiMeta): string {
  const normalizedColumns = normalizeColumns(columns);
  const context: ScenarioContext = {
    columns: normalizedColumns,
    frame,
    seed: buildScenarioSeed(meta, scenario),
    meta
  };

  switch (scenario) {
    case "zero-one":
      return renderZeroOneFrame(context);
    case "spaceship":
      return renderSpaceshipFrame(context);
    case "fire":
      return renderFireFrame(context);
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
