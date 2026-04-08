import { describe, expect, it } from "vitest";

import { renderAsciiPreview } from "./ascii.ts";

function expectThreeFullWidthRows(preview: string, width: number): string[] {
  const lines = preview.split("\n");
  expect(lines).toHaveLength(3);
  expect(lines.every((line) => line.length === width)).toBe(true);
  return lines;
}

describe("renderAsciiPreview", () => {
  it("renders zero-one as exactly three binary rows", () => {
    const preview = renderAsciiPreview("zero-one", {
      slideTitle: "Intro",
      summary: "Opening slide"
    }, 48, 12);
    const lines = preview.split("\n");

    expect(lines).toHaveLength(3);
    expect(preview).toMatch(/^[01 \n]+$/);
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
    const preview = renderAsciiPreview("terminal", {
      slideTitle: "Console",
      summary: "Commands"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
    expect(preview).toMatch(/^[ a-z0-9>_\-]+\n[ a-z0-9>_\-]+\n[ a-z0-9>_\-]+$/i);
    expect(preview).toContain(">");
    expect(preview).toMatch(/ok|ready|valid|clean|updated/i);
  });

  it("animates terminal across frames", () => {
    const start = renderAsciiPreview("terminal", {
      slideTitle: "Console",
      summary: "Commands"
    }, 48, 0);
    const later = renderAsciiPreview("terminal", {
      slideTitle: "Console",
      summary: "Commands"
    }, 48, 6);

    expect(later).not.toBe(start);
  });

  it("renders game-of-life as a cellular grid with births and survivors", () => {
    const preview = renderAsciiPreview("game-of-life", {
      slideTitle: "Life",
      summary: "Automaton"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
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
