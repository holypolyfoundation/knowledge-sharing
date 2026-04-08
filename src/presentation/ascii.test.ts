import { describe, expect, it } from "vitest";

import { getAsciiBlockHeight, getAsciiRowScale, renderAsciiPreview } from "./ascii.ts";

function expectFullWidthRows(preview: string, width: number, rowCount: number): string[] {
  const lines = preview.split("\n");
  expect(lines).toHaveLength(rowCount);
  expect(lines.every((line) => line.length === width)).toBe(true);
  return lines;
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
    const scenarios = ["zero-one", "fire", "terminal", "game-of-life"] as const;
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
    expect(combined).toMatch(/vite build|generate-slide-ascii|git diff --stat|ascii_seed: null/i);
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
