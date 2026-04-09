import { describe, expect, it } from "vitest";

import { getAsciiBlockHeight, getAsciiRowScale, renderAsciiPreview } from "./ascii.ts";

function expectFullWidthRows(preview: string, width: number, rowCount: number): string[] {
  const lines = preview.split("\n");
  expect(lines).toHaveLength(rowCount);
  expect(lines.every((line) => line.length === width)).toBe(true);
  return lines;
}

function collectLifeCells(preview: string, glyphs: string): Set<string> {
  const cells = new Set<string>();
  const lines = preview.split("\n");

  lines.forEach((line, row) => {
    for (let column = 0; column < line.length; column += 1) {
      if (glyphs.includes(line[column] ?? "")) {
        cells.add(`${row}:${column}`);
      }
    }
  });

  return cells;
}

function intersectSets(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => right.has(value)).sort();
}

function differenceSets(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => !right.has(value)).sort();
}

describe("renderAsciiPreview", () => {
  it("renders zero-one as exactly three binary rows by default", () => {
    const preview = renderAsciiPreview("zero-one", {
      slideTitle: "Intro",
      summary: "Opening slide"
    }, 48, 12);
    const lines = preview.split("\n");

    expect(lines).toHaveLength(3);
    expect(preview).toMatch(/^[01 \n]+$/);
  });

  it("renders every scenario with configurable row counts", () => {
    const scenarios = [
      "zero-one",
      "fire",
      "radar",
      "starfield",
      "circuit-pulse",
      "equalizer",
      "packet-flow",
      "tide",
      "hourglass",
      "forge",
      "swarm",
      "glitch-banner",
      "terminal",
      "game-of-life"
    ] as const;
    const rowCounts = [1, 3, 10];

    for (const scenario of scenarios) {
      for (const rowCount of rowCounts) {
        const preview = renderAsciiPreview(scenario, {
          slideTitle: "Preview",
          summary: "Rows"
        }, 48, 12, rowCount);

        expectFullWidthRows(preview, 48, rowCount);
      }
    }
  });

  it("allows taller ASCII blocks to use more columns instead of staying capped at the three-row width", () => {
    const preview = renderAsciiPreview("zero-one", {
      slideTitle: "Wide",
      summary: "Tall block"
    }, 400, 0, 10);

    expect(preview.split("\n")[0]).toHaveLength(400);
  });

  it("rotates the zero-one machine code grid right by one character per second", () => {
    const start = renderAsciiPreview("zero-one", {
      slideTitle: "Intro",
      summary: "Opening slide"
    }, 48, 0);
    const afterOneSecond = renderAsciiPreview("zero-one", {
      slideTitle: "Intro",
      summary: "Opening slide"
    }, 48, 12);

    const startRows = start.split("\n");
    const afterRows = afterOneSecond.split("\n");

    expect(afterRows).toEqual(
      startRows.map((row) => `${row[row.length - 1] ?? ""}${row.slice(0, -1)}`)
    );
  });

  it("renders fire as a full-width three-row flame field", () => {
    const preview = renderAsciiPreview("fire", {
      slideTitle: "Intro",
      summary: "Opening slide"
    }, 48, 18);
    const lines = preview.split("\n");

    expect(lines).toHaveLength(3);
    expect(lines.every((line) => line.length === 48)).toBe(true);
    expect(lines[2]).not.toContain(" ");
    expect(preview).toMatch(/^[ .:'`^*!/\\%;iIHM#@\n]+$/);
  });

  it("animates fire between frames while keeping the ember bed dense", () => {
    const start = renderAsciiPreview("fire", {
      slideTitle: "Intro",
      summary: "Opening slide"
    }, 48, 0);
    const later = renderAsciiPreview("fire", {
      slideTitle: "Intro",
      summary: "Opening slide"
    }, 48, 6);

    expect(later).not.toBe(start);
    expect(later.split("\n")[2]).not.toContain(" ");
  });

  it("renders radar as a sparse sweep field with pings", () => {
    const frames = Array.from({ length: 18 }, (_, frame) =>
      renderAsciiPreview("radar", {
        slideTitle: "Monitor",
        summary: "Sweep"
      }, 48, frame)
    );
    const combined = frames.join("\n");

    frames.forEach((preview) => {
      expectFullWidthRows(preview, 48, 3);
    });

    expect(combined).toMatch(/[|!:.']/);
    expect(combined).toMatch(/[Oo*+]/);
  });

  it("animates radar across frames", () => {
    const start = renderAsciiPreview("radar", {
      slideTitle: "Monitor",
      summary: "Sweep"
    }, 48, 0);
    const later = renderAsciiPreview("radar", {
      slideTitle: "Monitor",
      summary: "Sweep"
    }, 48, 8);

    expect(later).not.toBe(start);
  });

  it("renders starfield as a sparse parallax field", () => {
    const preview = renderAsciiPreview("starfield", {
      slideTitle: "Space",
      summary: "Parallax"
    }, 48, 18);
    const lines = expectFullWidthRows(preview, 48, 3);
    const visibleGlyphs = preview.replace(/[ \n]/g, "").length;

    expect(lines).toHaveLength(3);
    expect(preview).toMatch(/^[ .'*+=\-\n]+$/);
    expect(visibleGlyphs).toBeLessThan(40);
  });

  it("animates starfield across frames", () => {
    const start = renderAsciiPreview("starfield", {
      slideTitle: "Space",
      summary: "Parallax"
    }, 48, 0);
    const later = renderAsciiPreview("starfield", {
      slideTitle: "Space",
      summary: "Parallax"
    }, 48, 12);

    expect(later).not.toBe(start);
  });

  it("renders circuit-pulse with buses and signal pulses", () => {
    const frames = Array.from({ length: 12 }, (_, frame) =>
      renderAsciiPreview("circuit-pulse", {
        slideTitle: "Board",
        summary: "Signals"
      }, 48, frame)
    );
    const combined = frames.join("\n");

    frames.forEach((preview) => {
      expectFullWidthRows(preview, 48, 3);
    });

    expect(combined).toMatch(/[=\-|+]/);
    expect(combined).toMatch(/[@Oo]/);
  });

  it("animates circuit-pulse while keeping traces visible", () => {
    const start = renderAsciiPreview("circuit-pulse", {
      slideTitle: "Board",
      summary: "Signals"
    }, 48, 0);
    const later = renderAsciiPreview("circuit-pulse", {
      slideTitle: "Board",
      summary: "Signals"
    }, 48, 8);

    expect(later).not.toBe(start);
    expect(later).toMatch(/[=\-|+]/);
  });

  it("renders equalizer with bottom-anchored bars and peak holds", () => {
    const preview = renderAsciiPreview("equalizer", {
      slideTitle: "Audio",
      summary: "Levels"
    }, 48, 18, 6);
    const lines = expectFullWidthRows(preview, 48, 6);

    expect(preview).toMatch(/^[ :|#=\-\n]+$/);
    expect(lines[lines.length - 1]).toMatch(/[|#]/);
    expect(lines.some((line) => /[=-]/.test(line))).toBe(true);
  });

  it("animates equalizer across frames while supporting taller blocks", () => {
    const start = renderAsciiPreview("equalizer", {
      slideTitle: "Audio",
      summary: "Levels"
    }, 48, 0, 10);
    const later = renderAsciiPreview("equalizer", {
      slideTitle: "Audio",
      summary: "Levels"
    }, 48, 10, 10);

    expectFullWidthRows(later, 48, 10);
    expect(later).not.toBe(start);
  });

  it("renders packet-flow as bidirectional transport lanes", () => {
    const frames = Array.from({ length: 12 }, (_, frame) =>
      renderAsciiPreview("packet-flow", {
        slideTitle: "Network",
        summary: "Packets"
      }, 48, frame, 6)
    );
    const combined = frames.join("\n");

    frames.forEach((preview) => {
      expectFullWidthRows(preview, 48, 6);
    });

    expect(combined).toContain("[>]");
    expect(combined).toContain("[<]");
    expect(combined).toMatch(/[+\/\\-]/);
  });

  it("animates packet-flow across frames", () => {
    const start = renderAsciiPreview("packet-flow", {
      slideTitle: "Network",
      summary: "Packets"
    }, 48, 0, 6);
    const later = renderAsciiPreview("packet-flow", {
      slideTitle: "Network",
      summary: "Packets"
    }, 48, 8, 6);

    expect(later).not.toBe(start);
  });

  it("renders tide as layered wave bands", () => {
    const preview = renderAsciiPreview("tide", {
      slideTitle: "Ocean",
      summary: "Flow"
    }, 48, 18);

    expectFullWidthRows(preview, 48, 3);
    expect(preview).toMatch(/^[ ~_.\-\n]+$/);
    expect(preview).toMatch(/[~_-]/);
  });

  it("animates tide with visible lateral motion", () => {
    const start = renderAsciiPreview("tide", {
      slideTitle: "Ocean",
      summary: "Flow"
    }, 48, 0);
    const later = renderAsciiPreview("tide", {
      slideTitle: "Ocean",
      summary: "Flow"
    }, 48, 10);

    expect(later).not.toBe(start);
  });

  it("renders hourglass with chambers and falling sand", () => {
    const frames = Array.from({ length: 18 }, (_, frame) =>
      renderAsciiPreview("hourglass", {
        slideTitle: "Time",
        summary: "Drain"
      }, 48, frame, 6)
    );
    const combined = frames.join("\n");

    frames.forEach((preview) => {
      expectFullWidthRows(preview, 48, 6);
    });

    expect(combined).toMatch(/[\/\\|]/);
    expect(combined).toMatch(/[.:]/);
  });

  it("animates hourglass across frames", () => {
    const start = renderAsciiPreview("hourglass", {
      slideTitle: "Time",
      summary: "Drain"
    }, 48, 0, 6);
    const later = renderAsciiPreview("hourglass", {
      slideTitle: "Time",
      summary: "Drain"
    }, 48, 12, 6);

    expect(later).not.toBe(start);
  });

  it("renders forge as an industrial heat bar with sparks", () => {
    const frames = Array.from({ length: 18 }, (_, frame) =>
      renderAsciiPreview("forge", {
        slideTitle: "Build",
        summary: "Heat"
      }, 48, frame, 6)
    );
    const combined = frames.join("\n");

    frames.forEach((preview) => {
      expectFullWidthRows(preview, 48, 6);
    });

    expect(combined).toMatch(/[=#%:_]/);
    expect(combined).toMatch(/[*.]/);
  });

  it("animates forge while keeping its structure stable", () => {
    const start = renderAsciiPreview("forge", {
      slideTitle: "Build",
      summary: "Heat"
    }, 48, 0, 6);
    const later = renderAsciiPreview("forge", {
      slideTitle: "Build",
      summary: "Heat"
    }, 48, 8, 6);

    expect(later).not.toBe(start);
    expect(later).toMatch(/[=#%:_]/);
  });

  it("renders swarm as clustered particles", () => {
    const preview = renderAsciiPreview("swarm", {
      slideTitle: "Agents",
      summary: "Cluster"
    }, 48, 18, 6);
    const visibleGlyphs = preview.replace(/[ \n]/g, "").length;

    expectFullWidthRows(preview, 48, 6);
    expect(preview).toMatch(/^[ .*o\n]+$/);
    expect(visibleGlyphs).toBeGreaterThan(8);
    expect(visibleGlyphs).toBeLessThan(140);
  });

  it("animates swarm across frames without becoming dense noise", () => {
    const start = renderAsciiPreview("swarm", {
      slideTitle: "Agents",
      summary: "Cluster"
    }, 48, 0, 6);
    const later = renderAsciiPreview("swarm", {
      slideTitle: "Agents",
      summary: "Cluster"
    }, 48, 10, 6);

    expect(later).not.toBe(start);
    expect(later.replace(/[ \n]/g, "").length).toBeLessThan(140);
  });

  it("renders glitch-banner as a persistent signal strip", () => {
    const preview = renderAsciiPreview("glitch-banner", {
      slideTitle: "Signal",
      summary: "Distortion"
    }, 48, 2, 5);

    expectFullWidthRows(preview, 48, 5);
    expect(preview).toMatch(/^[ #=_\-\n]+$/);
    expect(preview).toMatch(/[=#-]/);
  });

  it("animates glitch-banner with distortion bursts", () => {
    const frames = Array.from({ length: 20 }, (_, frame) =>
      renderAsciiPreview("glitch-banner", {
        slideTitle: "Signal",
        summary: "Distortion"
      }, 48, frame, 5)
    );

    expect(frames.some((frame, index) => index > 0 && frame !== frames[index - 1])).toBe(true);
    expect(frames.join("\n")).toMatch(/[#=_-]/);
  });

  it("renders terminal as layered command streams with a prompt", () => {
    const frames = Array.from({ length: 180 }, (_, frame) =>
      renderAsciiPreview("terminal", {
        slideTitle: "Console",
        summary: "Commands"
      }, 96, frame)
    );
    const combined = frames.join("\n");

    frames.forEach((preview) => {
      expectFullWidthRows(preview, 96, 3);
    });

    expect(combined).toContain("~/knowledge-sharing % ");
    expect(combined).toMatch(/topics\/0-poly-tg-bot-guide|package\.json|src\/presentation\/ascii/i);
    expect(combined).toMatch(/vite build|generate-slide-ascii|git diff --stat|ascii_seed:/i);
  });

  it("renders taller terminal streams with more retained history", () => {
    const preview = renderAsciiPreview("terminal", {
      slideTitle: "Console",
      summary: "Commands"
    }, 96, 240, 10);

    expectFullWidthRows(preview, 96, 10);
    expect(preview.split("\n").some((line) => line.includes("~/knowledge-sharing % "))).toBe(true);
    expect(preview).toMatch(/topics\/0-poly-tg-bot-guide|package\.json|src\/presentation\/ascii/i);
  });

  it("animates terminal across frames and visibly backtracks during command edits", () => {
    const frames = Array.from({ length: 420 }, (_, frame) =>
      renderAsciiPreview("terminal", {
        slideTitle: "Console",
        summary: "Commands"
      }, 120, frame)
    );
    const activeLines = frames
      .map((preview) => preview.split("\n").find((line) => line.includes("_"))?.trimEnd() ?? "")
      .filter(Boolean);

    expect(frames.some((frame) => frame !== frames[0])).toBe(true);
    expect(
      activeLines.some((line, index) => index > 0 && line.length + 4 < activeLines[index - 1]!.length)
    ).toBe(true);
  });

  it("renders game-of-life as a cellular grid with births and survivors", () => {
    const preview = renderAsciiPreview("game-of-life", {
      slideTitle: "Life",
      summary: "Automaton"
    }, 48, 18);

    expectFullWidthRows(preview, 48, 3);
    expect(preview).toMatch(/^[.Oo+\n]+$/);
    expect(preview).toMatch(/[Oo]/);
  });

  it("animates game-of-life across generations", () => {
    const start = renderAsciiPreview("game-of-life", {
      slideTitle: "Life",
      summary: "Automaton"
    }, 48, 0);
    const later = renderAsciiPreview("game-of-life", {
      slideTitle: "Life",
      summary: "Automaton"
    }, 48, 12);

    expect(later).not.toBe(start);
  });

  it("uses tween frames so adjacent game-of-life frames are not duplicated", () => {
    const frames = Array.from({ length: 3 }, (_, frame) =>
      renderAsciiPreview("game-of-life", {
        slideTitle: "Life",
        summary: "Automaton"
      }, 48, frame)
    );

    expect(frames[1]).not.toBe(frames[0]);
    expect(frames[2]).not.toBe(frames[1]);
  });

  it("keeps odd game-of-life frames as transition tweens between even generations", () => {
    const current = renderAsciiPreview("game-of-life", {
      slideTitle: "Life",
      summary: "Automaton"
    }, 48, 0);
    const tween = renderAsciiPreview("game-of-life", {
      slideTitle: "Life",
      summary: "Automaton"
    }, 48, 1);
    const next = renderAsciiPreview("game-of-life", {
      slideTitle: "Life",
      summary: "Automaton"
    }, 48, 2);
    const currentLive = collectLifeCells(current, "Oo");
    const nextLive = collectLifeCells(next, "Oo");

    expect(tween).toMatch(/^[.Oo+\n]+$/);
    expect(collectLifeCells(tween, "O")).toEqual(new Set(intersectSets(currentLive, nextLive)));
    expect(collectLifeCells(tween, "o")).toEqual(new Set(differenceSets(currentLive, nextLive)));
    expect(collectLifeCells(tween, "+")).toEqual(new Set(differenceSets(nextLive, currentLive)));
  });

  it("keeps game-of-life moving across a sampled frame sequence", () => {
    const frames = Array.from({ length: 24 }, (_, frame) =>
      renderAsciiPreview("game-of-life", {
        slideTitle: "Life",
        summary: "Automaton"
      }, 24, frame)
    );

    for (let index = 1; index < frames.length; index += 1) {
      expect(frames[index]).not.toBe(frames[index - 1]);
    }
  });

  it("uses a settle tween before reseeding game-of-life", () => {
    const frames = Array.from({ length: 80 }, (_, frame) =>
      renderAsciiPreview("game-of-life", {
        slideTitle: "Life",
        summary: "Automaton"
      }, 24, frame)
    );
    let settleTweenIndex = -1;

    for (let index = 1; index < frames.length - 1; index += 2) {
      if (/^[.o\n]+$/.test(frames[index] ?? "")) {
        settleTweenIndex = index;
        break;
      }
    }

    expect(settleTweenIndex).toBeGreaterThanOrEqual(1);
    expect(frames[settleTweenIndex]).not.toBe(frames[settleTweenIndex - 1]);
    expect(frames[settleTweenIndex]).not.toBe(frames[settleTweenIndex + 1]);
  });

  it("reinitializes game-of-life when a generation freezes", () => {
    const generations = Array.from({ length: 40 }, (_, index) =>
      renderAsciiPreview("game-of-life", {
        slideTitle: "Life",
        summary: "Automaton"
      }, 24, index * 2)
    );

    for (let index = 1; index < generations.length; index += 1) {
      expect(generations[index]).not.toBe(generations[index - 1]);
    }
  });

  it("reinitializes game-of-life when a short oscillator repeats", () => {
    const generations = Array.from({ length: 40 }, (_, index) =>
      renderAsciiPreview("game-of-life", {
        slideTitle: "Life",
        summary: "Automaton"
      }, 24, index * 2)
    );

    for (let index = 2; index < generations.length; index += 1) {
      expect(generations[index]).not.toBe(generations[index - 2]);
    }
  });
});

describe("ASCII layout metrics", () => {
  it("keeps the baseline three-row block height at 51.15px", () => {
    expect(getAsciiRowScale(3)).toBe(1);
    expect(getAsciiBlockHeight(3)).toBeCloseTo(51.15, 2);
  });

  it("keeps a ten-row block within two pixels of the baseline height", () => {
    const baseline = getAsciiBlockHeight(3);
    const taller = getAsciiBlockHeight(10);

    expect(getAsciiRowScale(10)).toBeCloseTo(0.3, 3);
    expect(Math.abs(taller - baseline)).toBeLessThanOrEqual(2);
  });
});
