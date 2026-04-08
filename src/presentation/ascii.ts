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

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
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

function stampWrapped(rows: string[][], row: number, column: number, text: string): void {
  if (row < 0 || row >= rows.length) {
    return;
  }

  const rowWidth = rows[row]?.length ?? 0;

  if (rowWidth === 0) {
    return;
  }

  for (let index = 0; index < text.length; index += 1) {
    rows[row][mod(column + index, rowWidth)] = text[index] ?? " ";
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

function buildLaneRows(rows: number, minLanes = 3, maxLanes = 8): number[] {
  const laneCount = Math.min(
    maxLanes,
    Math.max(1, Math.min(rows, rows >= minLanes ? Math.max(minLanes, Math.floor(rows * 0.75)) : rows))
  );
  const laneRows: number[] = [];

  for (let index = 0; index < laneCount; index += 1) {
    const remaining = laneCount - index - 1;
    const minRow = laneRows[index - 1] === undefined ? 0 : laneRows[index - 1] + 1;
    const ideal = laneCount === 1 ? Math.floor((rows - 1) / 2) : Math.round((index * (rows - 1)) / (laneCount - 1));
    const maxRow = rows - 1 - remaining;
    laneRows.push(clamp(ideal, minRow, maxRow));
  }

  return laneRows;
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

interface TerminalCorrection {
  prefix: string;
  abandonedTail: string;
  replacementTail: string;
}

interface TerminalInteraction {
  command: string;
  outputs: readonly string[];
  correction?: TerminalCorrection;
}

interface TerminalTimeline {
  initialCommand: string;
  finalCommand: string;
  initialTypingFrames: number[];
  eraseFrames: number[];
  retypeFrames: number[];
  outputFrames: number[];
  preErasePause: number;
  postErasePause: number;
  submitPause: number;
  outputLeadIn: number;
  finalHold: number;
  totalFrames: number;
}

const TERMINAL_PROMPT = "~/knowledge-sharing % ";
const TERMINAL_CURSOR = "_";

const TERMINAL_INTERACTIONS: readonly TerminalInteraction[] = [
  {
    command: "pnpm test -- --reporter=dot src/presentation/ascii.test.ts",
    correction: {
      prefix: "pnpm test -- ",
      abandonedTail: "--run src/presentation/asc",
      replacementTail: "--reporter=dot src/presentation/ascii.test.ts"
    },
    outputs: [
      "RUN  src/presentation/ascii.test.ts",
      "12 tests passed in 91ms",
      "Duration 143ms (transform 32ms, collect 18ms, tests 91ms)"
    ]
  },
  {
    command: 'rg -n "ascii_seed: (terminal|null)" topics | sort -t: -k1,1 -k2,2n',
    outputs: [
      "topics/0-poly-tg-bot-guide/2-retro-enfineering.md:4:ascii_seed: terminal",
      "topics/0-poly-tg-bot-guide/4-modern-dev-tooling.md:4:ascii_seed: null",
      "topics/0-poly-tg-bot-guide/8-qa.md:4:ascii_seed: null"
    ]
  },
  {
    command: "jq -r '.scripts | to_entries[] | [.key,.value] | @tsv' package.json | column -t -s $'\\t'",
    outputs: [
      "dev       vite",
      "build     vite build",
      "preview   vite preview",
      "validate  node --import tsx scripts/build-presentation-manifest.mjs",
      "test      vitest run",
      "ascii     node --import tsx scripts/generate-slide-ascii.mjs"
    ]
  },
  {
    command: "git diff --stat -- src/presentation/ascii.ts src/presentation/ascii.test.ts",
    correction: {
      prefix: "git diff --stat -- src/presentation/ascii.ts ",
      abandonedTail: "src/presentation/ascii.tset.ts",
      replacementTail: "src/presentation/ascii.test.ts"
    },
    outputs: [
      " src/presentation/ascii.ts      | 188 ++++++++++++++++++++++++++++++++------",
      " src/presentation/ascii.test.ts |  41 +++++++++-",
      " 2 files changed, 191 insertions(+), 38 deletions(-)"
    ]
  },
  {
    command: "fd -e md topics | xargs rg -n '^title:|^ascii_seed:' | head -n 6",
    outputs: [
      "topics/0-poly-tg-bot-guide/0-intro.md:2:title: Intro",
      "topics/0-poly-tg-bot-guide/0-intro.md:4:ascii_seed: zero-one",
      "topics/0-poly-tg-bot-guide/2-retro-enfineering.md:2:title: Retro Enfineering",
      "topics/0-poly-tg-bot-guide/2-retro-enfineering.md:4:ascii_seed: terminal"
    ]
  },
  {
    command: "find src -maxdepth 2 -name '*.ts' -print | sort | xargs wc -l | tail -n 5",
    outputs: [
      "   46 src/ascii/seed-generator.ts",
      "  181 src/content/load-topics.ts",
      "  149 src/presentation/ascii.test.ts",
      "  402 src/presentation/ascii.ts",
      "  998 total"
    ]
  },
  {
    command: "pnpm validate 2>&1 | sed -n '1,5p'",
    outputs: [
      "building presentation manifest",
      "loaded 1 topic and 9 slides",
      "virtual:presentation-manifest ready",
      "validation completed in 74ms"
    ]
  }
] as const;

function wrapTerminalLines(lines: readonly string[], columns: number): string[] {
  const wrapped: string[] = [];

  for (const line of lines) {
    if (line.length === 0) {
      wrapped.push(" ".repeat(columns));
      continue;
    }

    for (let index = 0; index < line.length; index += columns) {
      wrapped.push(line.slice(index, index + columns).padEnd(columns, " "));
    }
  }

  return wrapped;
}

function renderTerminalViewport(lines: readonly string[], columns: number, rows: number): string {
  const wrapped = wrapTerminalLines(lines, columns);
  const visible = wrapped.slice(-rows);
  const padded = visible.length >= rows
    ? visible
    : [...Array.from({ length: rows - visible.length }, () => " ".repeat(columns)), ...visible];

  return padded.join("\n");
}

function buildTerminalCadence(text: string, seed: number, mode: "type" | "erase"): number[] {
  const cadence: number[] = [];
  let elapsed = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    const noise = hashSeed(`${seed}|${mode}|${index}|${char}`);
    let step = mode === "erase" ? 1 : 1 + (noise % 2);

    if (mode === "type") {
      if (char === " ") {
        step += 1;
      } else if ("|&".includes(char)) {
        step += 2;
      } else if ("'\"()[]{}".includes(char)) {
        step += 1;
      } else if ("/.:".includes(char) && (noise & 3) === 0) {
        step += 1;
      }

      if ((noise & 15) === 0) {
        step += 1;
      }
    } else if ((noise & 3) === 0) {
      step += 1;
    }

    elapsed += step;
    cadence.push(elapsed);
  }

  return cadence;
}

function countVisibleSteps(frames: readonly number[], frame: number): number {
  let visible = 0;

  while (visible < frames.length && frame >= frames[visible]) {
    visible += 1;
  }

  return visible;
}

function getTerminalBlink(frame: number): string {
  return Math.floor(frame / 3) % 2 === 0 ? TERMINAL_CURSOR : " ";
}

function buildTerminalTimeline(interaction: TerminalInteraction, seed: number): TerminalTimeline {
  const finalCommand = interaction.command;
  const initialCommand = interaction.correction
    ? `${interaction.correction.prefix}${interaction.correction.abandonedTail}`
    : finalCommand;
  const initialTypingFrames = buildTerminalCadence(initialCommand, seed, "type");
  const eraseFrames = interaction.correction
    ? buildTerminalCadence(interaction.correction.abandonedTail, seed + 11, "erase")
    : [];
  const retypeFrames = interaction.correction
    ? buildTerminalCadence(interaction.correction.replacementTail, seed + 29, "type")
    : [];
  const outputFrames = interaction.outputs.map((line, index) => {
    const base = 3 + Math.min(5, Math.floor(line.length / 18));
    const jitter = hashSeed(`${seed}|output|${index}|${line}`) % 3;
    return base + jitter;
  }).reduce<number[]>((frames, duration) => {
    const elapsed = (frames.at(-1) ?? 0) + duration;
    frames.push(elapsed);
    return frames;
  }, []);
  const preErasePause = interaction.correction ? 4 + (seed % 3) : 0;
  const postErasePause = interaction.correction ? 2 + ((seed >>> 3) % 3) : 0;
  const submitPause = 4 + ((seed >>> 5) % 3);
  const outputLeadIn = 2 + ((seed >>> 7) % 2);
  const finalHold = 8 + ((seed >>> 9) % 4);
  const totalFrames =
    (initialTypingFrames.at(-1) ?? 0)
    + preErasePause
    + (eraseFrames.at(-1) ?? 0)
    + postErasePause
    + (retypeFrames.at(-1) ?? 0)
    + submitPause
    + outputLeadIn
    + (outputFrames.at(-1) ?? 0)
    + finalHold;

  return {
    initialCommand,
    finalCommand,
    initialTypingFrames,
    eraseFrames,
    retypeFrames,
    outputFrames,
    preErasePause,
    postErasePause,
    submitPause,
    outputLeadIn,
    finalHold,
    totalFrames
  };
}

function getCompletedInteractionLines(interaction: TerminalInteraction): string[] {
  return [`${TERMINAL_PROMPT}${interaction.command}`, ...interaction.outputs];
}

function getTerminalInteractionState(interaction: TerminalInteraction, timeline: TerminalTimeline, frame: number): string[] {
  let remaining = frame;

  if (remaining < (timeline.initialTypingFrames.at(-1) ?? 0)) {
    const typedChars = countVisibleSteps(timeline.initialTypingFrames, remaining);
    return [`${TERMINAL_PROMPT}${timeline.initialCommand.slice(0, typedChars)}${getTerminalBlink(remaining)}`];
  }

  remaining -= timeline.initialTypingFrames.at(-1) ?? 0;

  if (interaction.correction) {
    if (remaining < timeline.preErasePause) {
      return [`${TERMINAL_PROMPT}${timeline.initialCommand}${getTerminalBlink(remaining)}`];
    }

    remaining -= timeline.preErasePause;

    if (remaining < (timeline.eraseFrames.at(-1) ?? 0)) {
      const erasedChars = countVisibleSteps(timeline.eraseFrames, remaining);
      const visibleLength = timeline.initialCommand.length - erasedChars;
      return [`${TERMINAL_PROMPT}${timeline.initialCommand.slice(0, visibleLength)}${getTerminalBlink(remaining)}`];
    }

    remaining -= timeline.eraseFrames.at(-1) ?? 0;

    if (remaining < timeline.postErasePause) {
      return [`${TERMINAL_PROMPT}${interaction.correction.prefix}${getTerminalBlink(remaining)}`];
    }

    remaining -= timeline.postErasePause;

    if (remaining < (timeline.retypeFrames.at(-1) ?? 0)) {
      const typedChars = countVisibleSteps(timeline.retypeFrames, remaining);
      return [
        `${TERMINAL_PROMPT}${interaction.correction.prefix}${interaction.correction.replacementTail.slice(0, typedChars)}${getTerminalBlink(remaining)}`
      ];
    }

    remaining -= timeline.retypeFrames.at(-1) ?? 0;
  }

  if (remaining < timeline.submitPause) {
    return [`${TERMINAL_PROMPT}${timeline.finalCommand}${getTerminalBlink(remaining)}`];
  }

  remaining -= timeline.submitPause;

  if (remaining < timeline.outputLeadIn) {
    return [`${TERMINAL_PROMPT}${timeline.finalCommand}`];
  }

  remaining -= timeline.outputLeadIn;

  if (remaining < (timeline.outputFrames.at(-1) ?? 0)) {
    const visibleOutputs = countVisibleSteps(timeline.outputFrames, remaining);
    return [
      `${TERMINAL_PROMPT}${timeline.finalCommand}`,
      ...interaction.outputs.slice(0, visibleOutputs)
    ];
  }

  remaining -= timeline.outputFrames.at(-1) ?? 0;

  if (remaining < timeline.finalHold) {
    return getCompletedInteractionLines(interaction);
  }

  return getCompletedInteractionLines(interaction);
}

function renderTerminalFrame(context: ScenarioContext): string {
  const interactions = Array.from({ length: TERMINAL_INTERACTIONS.length }, (_, index) =>
    TERMINAL_INTERACTIONS[(index + (context.seed % TERMINAL_INTERACTIONS.length)) % TERMINAL_INTERACTIONS.length] ?? TERMINAL_INTERACTIONS[0]
  );
  const timelines = interactions.map((interaction, index) =>
    buildTerminalTimeline(interaction, hashSeed(`${context.seed}|interaction|${index}|${interaction.command}`))
  );
  const cycleDuration = timelines.reduce((sum, timeline) => sum + timeline.totalFrames, 0);
  const absoluteFrame = context.frame + (context.seed % Math.max(1, cycleDuration));
  const cyclesCompleted = Math.floor(absoluteFrame / cycleDuration);
  let localFrame = absoluteFrame % cycleDuration;
  const lines: string[] = [];

  if (cyclesCompleted > 0) {
    for (const interaction of interactions) {
      lines.push(...getCompletedInteractionLines(interaction));
    }
  }

  for (let index = 0; index < interactions.length; index += 1) {
    const interaction = interactions[index] ?? interactions[0];
    const timeline = timelines[index] ?? timelines[0];

    if (localFrame >= timeline.totalFrames) {
      lines.push(...getCompletedInteractionLines(interaction));
      localFrame -= timeline.totalFrames;
      continue;
    }

    lines.push(...getTerminalInteractionState(interaction, timeline, localFrame));
    break;
  }

  return renderTerminalViewport(lines, context.columns, context.rows);
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

function renderRadarFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const sweepWidth = Math.max(4, Math.round(context.columns * 0.08));
  const sweepHead = mod(Math.floor(context.frame * 1.5) + (context.seed % context.columns), context.columns);
  const targetCount = clamp(3 + (context.seed % 6), 3, 8);

  for (let row = 0; row < context.rows; row += 1) {
    for (let column = 0; column < context.columns; column += 1) {
      const noise = hashSeed(`${context.seed}|radar|bg|${row}|${column}`);
      const sweepAge = mod(sweepHead - column, context.columns);

      if ((noise & 63) === 0) {
        rows[row][column] = ".";
      } else if ((noise & 127) === 1) {
        rows[row][column] = "'";
      }

      if (sweepAge < sweepWidth) {
        if (sweepAge === 0) {
          rows[row][column] = "|";
        } else if (sweepAge < 2) {
          rows[row][column] = "!";
        } else if (sweepAge < 4 && rows[row][column] === " ") {
          rows[row][column] = ":";
        } else if (rows[row][column] === " ") {
          rows[row][column] = ".";
        }
      }
    }
  }

  for (let index = 0; index < targetCount; index += 1) {
    const targetRow = hashSeed(`${context.seed}|radar|target-row|${index}`) % context.rows;
    const targetColumn = hashSeed(`${context.seed}|radar|target-column|${index}`) % context.columns;
    const sweepAge = mod(sweepHead - targetColumn, context.columns);

    if (sweepAge >= sweepWidth + 2) {
      continue;
    }

    const glyph = sweepAge === 0 ? "O" : sweepAge === 1 ? "o" : sweepAge <= 3 ? "*" : "+";
    rows[targetRow][targetColumn] = glyph;

    if (context.rows > 3 && sweepAge <= 2) {
      const echoGlyph = sweepAge === 0 ? "o" : "+";
      if (targetRow > 0) {
        rows[targetRow - 1][targetColumn] = echoGlyph;
      }

      if (targetRow < context.rows - 1) {
        rows[targetRow + 1][targetColumn] = echoGlyph;
      }
    }
  }

  return renderRows(rows);
}

function renderStarfieldFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const area = context.columns * context.rows;
  const layers = [
    { name: "far", count: Math.max(4, Math.floor(area / 18)), stepDivisor: 6, glyphs: [".", "'"] as const },
    { name: "mid", count: Math.max(3, Math.floor(area / 36)), stepDivisor: 3, glyphs: ["*"] as const },
    { name: "near", count: Math.max(2, Math.floor(area / 72)), stepDivisor: 2, glyphs: ["+", "-", "="] as const }
  ] as const;

  for (const [layerIndex, layer] of layers.entries()) {
    const shift = Math.floor(context.frame / layer.stepDivisor);

    for (let index = 0; index < layer.count; index += 1) {
      const row = hashSeed(`${context.seed}|starfield|${layer.name}|row|${index}`) % context.rows;
      const baseColumn = hashSeed(`${context.seed}|starfield|${layer.name}|column|${index}`) % context.columns;
      const column = mod(baseColumn - shift - index * (layerIndex + 1), context.columns);
      const glyphSeed = hashSeed(`${context.seed}|starfield|${layer.name}|glyph|${index}`);

      if (layer.name === "near" && (context.frame + index) % 4 === 0) {
        stampWrapped(rows, row, column, (glyphSeed & 1) === 0 ? "==" : "--");
        continue;
      }

      rows[row][column] = layer.glyphs[glyphSeed % layer.glyphs.length] ?? layer.glyphs[0];
    }
  }

  return renderRows(rows);
}

function renderCircuitPulseFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const laneRows = buildLaneRows(context.rows, 3, 8);
  const connectorCount = Math.max(2, Math.floor(context.columns / 18));

  for (const [laneIndex, laneRow] of laneRows.entries()) {
    const laneGlyph = laneIndex % 2 === 0 ? "=" : "-";

    for (let column = 0; column < context.columns; column += 1) {
      rows[laneRow][column] = laneGlyph;
    }
  }

  for (let index = 0; index < connectorCount; index += 1) {
    const laneIndex = index % Math.max(1, laneRows.length - 1);
    const startRow = laneRows[laneIndex] ?? 0;
    const endRow = laneRows[laneIndex + 1] ?? startRow;
    const column = 3 + (hashSeed(`${context.seed}|circuit|connector|${index}`) % Math.max(4, context.columns - 6));

    rows[startRow][column] = "+";
    rows[endRow][column] = "+";

    for (let row = Math.min(startRow, endRow) + 1; row < Math.max(startRow, endRow); row += 1) {
      rows[row][column] = "|";
    }
  }

  for (const [laneIndex, laneRow] of laneRows.entries()) {
    const pulseCount = laneIndex % 2 === 0 ? 2 : 1;

    for (let pulseIndex = 0; pulseIndex < pulseCount; pulseIndex += 1) {
      const travel = Math.floor((context.frame + pulseIndex * 5) / (pulseIndex === 0 ? 2 : 3));
      const origin = hashSeed(`${context.seed}|circuit|pulse|${laneIndex}|${pulseIndex}`) % context.columns;
      const column = mod(origin + travel, context.columns);
      const pulsePhase = (context.frame + pulseIndex + laneIndex) % 6;
      const glyph = pulsePhase === 0 ? "@" : pulsePhase <= 2 ? "O" : "o";
      rows[laneRow][column] = glyph;
    }
  }

  return renderRows(rows);
}

function renderEqualizerFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const barWidth = context.columns >= 72 ? 3 : 2;
  const gap = 1;
  const barCount = Math.max(1, Math.floor((context.columns + gap) / (barWidth + gap)));
  const phase = ((context.seed % 8192) / 8192) * Math.PI * 2;

  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const startColumn = barIndex * (barWidth + gap);
    const baseWave = 0.52
      + Math.sin(context.frame / 4.2 + barIndex * 0.58 + phase) * 0.24
      + Math.sin(context.frame / 9.1 - barIndex * 0.31 + phase * 0.6) * 0.16;
    const jitter = ((hashSeed(`${context.seed}|equalizer|${barIndex}`) % 100) / 100 - 0.5) * 0.14;
    const level = clamp(baseWave + jitter, 0.08, 1);
    const previousLevel = clamp(
      0.52
        + Math.sin((context.frame - 5) / 4.2 + barIndex * 0.58 + phase) * 0.24
        + Math.sin((context.frame - 5) / 9.1 - barIndex * 0.31 + phase * 0.6) * 0.16
        + jitter,
      0.08,
      1
    );
    const filledRows = Math.max(1, Math.round(level * context.rows));
    const peakRows = Math.max(filledRows, Math.round(previousLevel * context.rows));

    for (let offset = 0; offset < barWidth; offset += 1) {
      const column = startColumn + offset;

      if (column >= context.columns) {
        continue;
      }

      for (let filled = 0; filled < filledRows; filled += 1) {
        const row = context.rows - 1 - filled;
        rows[row][column] = filled === filledRows - 1 ? "#" : filled < 2 ? "|" : ":";
      }

      const peakRow = context.rows - peakRows - 1;
      if (peakRow >= 0 && peakRow < context.rows && peakRows > filledRows) {
        rows[peakRow][column] = offset % 2 === 0 ? "=" : "-";
      }
    }
  }

  return renderRows(rows);
}

function renderPacketFlowFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const laneRows = buildLaneRows(context.rows, 3, 8);
  const switchCount = Math.max(2, Math.floor(context.columns / 22));

  for (const laneRow of laneRows) {
    for (let column = 0; column < context.columns; column += 1) {
      rows[laneRow][column] = "-";
    }
  }

  for (let index = 0; index < switchCount; index += 1) {
    const topLane = laneRows[index % Math.max(1, laneRows.length - 1)] ?? 0;
    const bottomLane = laneRows[Math.min(laneRows.length - 1, (index % Math.max(1, laneRows.length - 1)) + 1)] ?? topLane;
    const column = 5 + (hashSeed(`${context.seed}|packet|switch|${index}`) % Math.max(6, context.columns - 10));
    rows[topLane][column] = "+";
    rows[bottomLane][column] = "+";

    if (bottomLane - topLane <= 1) {
      if (column + 1 < context.columns) {
        rows[topLane][column + 1] = "\\";
      }

      if (column - 1 >= 0) {
        rows[bottomLane][column - 1] = "/";
      }
      continue;
    }

    for (let row = topLane + 1; row < bottomLane; row += 1) {
      rows[row][column] = "|";
    }

    if (column + 1 < context.columns) {
      rows[topLane][column + 1] = "\\";
    }

    if (column - 1 >= 0) {
      rows[bottomLane][column - 1] = "/";
    }
  }

  for (const [laneIndex, laneRow] of laneRows.entries()) {
    const direction = laneIndex % 2 === 0 ? 1 : -1;
    const token = direction > 0 ? "[>]" : "[<]";
    const baseColumn = hashSeed(`${context.seed}|packet|lane|${laneIndex}`) % context.columns;
    const travel = Math.floor((context.frame + laneIndex * 3) / 2) * direction;
    const column = mod(baseColumn + travel, context.columns);
    stampWrapped(rows, laneRow, column, token);
  }

  return renderRows(rows);
}

function renderTideFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const phase = ((context.seed % 2048) / 2048) * Math.PI * 2;

  for (let row = 0; row < context.rows; row += 1) {
    const baseRow = context.rows === 1 ? 0 : row / Math.max(1, context.rows - 1);
    const amplitude = Math.max(0.7, context.columns * (0.012 + baseRow * 0.01));
    const rowPhase = phase + row * 0.62;

    for (let column = 0; column < context.columns; column += 1) {
      const x = column / Math.max(8, context.columns / 7);
      const wave = Math.sin(x + context.frame / 6 + rowPhase) * 0.62
        + Math.sin(x * 0.55 - context.frame / 11 + rowPhase * 0.8) * 0.38;
      const crest = Math.sin(x * 1.4 + context.frame / 8 + rowPhase * 1.3);
      const rowCenter = (row + 0.5) + wave * amplitude / Math.max(1, context.columns / 16);
      const distance = Math.abs((row + 0.5) - rowCenter);
      const normalized = clamp(1 - distance * 2.1, 0, 1);

      if (normalized < 0.15) {
        if ((hashSeed(`${context.seed}|tide|mist|${row}|${column}`) & 127) === 0) {
          rows[row][column] = ".";
        }
        continue;
      }

      if (normalized > 0.82 && crest > 0.45) {
        rows[row][column] = "~";
      } else if (normalized > 0.62) {
        rows[row][column] = "-";
      } else if (normalized > 0.4) {
        rows[row][column] = "_";
      } else if ((column + row + context.frame) % 7 === 0) {
        rows[row][column] = ".";
      }
    }
  }

  return renderRows(rows);
}

function renderHourglassFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const center = Math.floor(context.columns / 2);
  const loopLength = Math.max(20, context.rows * 12);
  const cycleFrame = context.frame % loopLength;
  const progress = cycleFrame / Math.max(1, loopLength - 1);
  const upperFill = Math.max(0, 1 - progress);
  const lowerFill = progress;
  const topRows = Math.max(1, Math.floor(context.rows / 2));
  const bottomStart = topRows;

  for (let row = 0; row < context.rows; row += 1) {
    const isTop = row < topRows;
    const localRow = isTop ? row : row - bottomStart;
    const halfSpan = isTop
      ? Math.max(1, Math.round(((topRows - localRow) / Math.max(1, topRows)) * Math.max(2, context.columns * 0.16)))
      : Math.max(1, Math.round(((localRow + 1) / Math.max(1, context.rows - bottomStart)) * Math.max(2, context.columns * 0.16)));
    const leftWall = clamp(center - halfSpan, 0, context.columns - 1);
    const rightWall = clamp(center + halfSpan, 0, context.columns - 1);

    rows[row][leftWall] = "/";
    rows[row][rightWall] = "\\";

    if (leftWall + 1 < rightWall) {
      const fillProgress = isTop ? upperFill : lowerFill;
      const chamberHeight = isTop ? topRows : Math.max(1, context.rows - bottomStart);
      const normalizedRow = isTop
        ? (localRow + 1) / Math.max(1, chamberHeight)
        : 1 - (localRow / Math.max(1, chamberHeight));
      const filled = isTop ? normalizedRow > 1 - fillProgress : normalizedRow <= fillProgress;

      for (let column = leftWall + 1; column < rightWall; column += 1) {
        if (filled) {
          const grain = hashSeed(`${context.seed}|hourglass|grain|${row}|${column}|${cycleFrame}`);
          rows[row][column] = (grain & 3) === 0 ? ":" : ".";
        } else if ((hashSeed(`${context.seed}|hourglass|air|${row}|${column}`) & 255) === 0) {
          rows[row][column] = ".";
        }
      }
    }
  }

  for (let row = topRows - 1; row <= Math.min(context.rows - 1, bottomStart); row += 1) {
    if (row >= 0) {
      rows[row][center] = "|";
    }
  }

  const fallingRow = clamp(topRows + (cycleFrame % Math.max(1, context.rows - topRows)), topRows, context.rows - 1);
  rows[fallingRow][center] = ":";
  if (fallingRow - 1 >= 0) {
    rows[fallingRow - 1][center] = ".";
  }

  return renderRows(rows);
}

function renderForgeFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const anvilRow = Math.min(context.rows - 1, Math.max(0, Math.floor(context.rows * 0.7)));
  const barRow = Math.max(0, anvilRow - 1);
  const barWidth = Math.max(6, Math.floor(context.columns * 0.28));
  const barStart = Math.max(1, Math.floor((context.columns - barWidth) / 2));
  const pulse = 0.5 + Math.sin(context.frame / 4 + ((context.seed % 1024) / 1024) * Math.PI * 2) * 0.5;

  for (let column = 0; column < context.columns; column += 1) {
    if (column >= barStart && column < barStart + barWidth) {
      const hotspot = Math.sin((column - barStart) / Math.max(2, barWidth / 6) + context.frame / 5) * 0.25;
      const intensity = clamp(pulse + hotspot, 0, 1);
      rows[barRow][column] = intensity > 0.78 ? "%" : intensity > 0.6 ? "#" : intensity > 0.42 ? "=" : ":";
    }

    if (rowHasSpace(rows, anvilRow, column)) {
      rows[anvilRow][column] = column >= barStart - 2 && column < barStart + barWidth + 2 ? "=" : column % 3 === 0 ? "_" : " ";
    }
  }

  const sparkCount = Math.max(2, Math.floor(context.columns / 20));
  for (let index = 0; index < sparkCount; index += 1) {
    const cadence = 10 + (index % 3) * 3;
    const age = (context.frame + index * 4) % cadence;
    if (age > 4) {
      continue;
    }

    const origin = barStart + (hashSeed(`${context.seed}|forge|spark-origin|${index}`) % barWidth);
    const direction = (hashSeed(`${context.seed}|forge|spark-direction|${index}`) & 1) === 0 ? -1 : 1;
    const row = Math.max(0, barRow - age);
    const column = clamp(origin + direction * age, 0, context.columns - 1);
    rows[row][column] = age === 0 ? "*" : age < 3 ? "." : ":";
  }

  return renderRows(rows);
}

function rowHasSpace(rows: string[][], row: number, column: number): boolean {
  return rows[row]?.[column] === " ";
}

function renderSwarmFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const particleCount = Math.max(10, Math.floor((context.columns * context.rows) / 8));
  const attractorCount = context.rows >= 5 ? 2 : 1;
  const attractors = Array.from({ length: attractorCount }, (_, index) => {
    const phase = ((hashSeed(`${context.seed}|swarm|attractor|${index}`) % 4096) / 4096) * Math.PI * 2;
    return {
      x: (context.columns - 1) / 2 + Math.sin(context.frame / (8 + index * 3) + phase) * context.columns * (0.14 + index * 0.05),
      y: (context.rows - 1) / 2 + Math.cos(context.frame / (10 + index * 4) + phase * 1.3) * Math.max(0.8, context.rows * 0.22)
    };
  });

  for (let index = 0; index < particleCount; index += 1) {
    const homeX = hashSeed(`${context.seed}|swarm|home-x|${index}`) % context.columns;
    const homeY = hashSeed(`${context.seed}|swarm|home-y|${index}`) % context.rows;
    const target = attractors[index % attractors.length] ?? attractors[0]!;
    const wobbleX = Math.sin(context.frame / 5 + index * 0.73 + (context.seed % 17)) * 1.8;
    const wobbleY = Math.cos(context.frame / 7 + index * 0.51 + (context.seed % 23)) * 0.8;
    const x = Math.round(homeX * 0.28 + target.x * 0.72 + wobbleX);
    const y = Math.round(homeY * 0.22 + target.y * 0.78 + wobbleY);

    if (y < 0 || y >= context.rows || x < 0 || x >= context.columns) {
      continue;
    }

    const existing = rows[y][x];
    rows[y][x] = existing === " " ? "." : existing === "." ? "o" : "*";
  }

  return renderRows(rows);
}

function renderGlitchBannerFrame(context: ScenarioContext): string {
  const rows = createBlankRows(context.columns, context.rows);
  const bannerRow = Math.floor((context.rows - 1) / 2);
  const burst = (Math.floor(context.frame / 9) + (context.seed % 5)) % 4 === 0;
  const offset = burst ? ((context.frame + context.seed) % 7) - 3 : 0;

  for (let column = 0; column < context.columns; column += 1) {
    rows[bannerRow][column] = column % 6 === 0 ? "#" : column % 2 === 0 ? "=" : "-";

    if (bannerRow > 0 && column % 9 === 0) {
      rows[bannerRow - 1][column] = "_";
    }

    if (bannerRow < context.rows - 1 && column % 11 === 0) {
      rows[bannerRow + 1][column] = "-";
    }
  }

  if (burst) {
    const sliced = [...rows[bannerRow] ?? []];
    for (let column = 0; column < context.columns; column += 1) {
      rows[bannerRow][mod(column + offset, context.columns)] = sliced[column] ?? " ";
    }

    const noiseRow = bannerRow > 0 && (context.frame % 2 === 0) ? bannerRow - 1 : Math.min(context.rows - 1, bannerRow + 1);
    for (let column = 0; column < context.columns; column += 1) {
      if ((hashSeed(`${context.seed}|glitch|${context.frame}|${column}`) & 7) === 0) {
        rows[noiseRow][column] = column % 2 === 0 ? "#" : "_";
      }
    }
  }

  return renderRows(rows);
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
    case "radar":
      return renderRadarFrame(context);
    case "starfield":
      return renderStarfieldFrame(context);
    case "circuit-pulse":
      return renderCircuitPulseFrame(context);
    case "equalizer":
      return renderEqualizerFrame(context);
    case "packet-flow":
      return renderPacketFlowFrame(context);
    case "tide":
      return renderTideFrame(context);
    case "hourglass":
      return renderHourglassFrame(context);
    case "forge":
      return renderForgeFrame(context);
    case "swarm":
      return renderSwarmFrame(context);
    case "glitch-banner":
      return renderGlitchBannerFrame(context);
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
