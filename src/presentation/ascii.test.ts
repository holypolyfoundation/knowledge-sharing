import { describe, expect, it } from "vitest";

import { renderAsciiPreview } from "./ascii.ts";

function characterAt(preview: string, row: number, column: number): string {
  return preview.split("\n")[row]?.[column] ?? " ";
}

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

  it("renders spaceship with a ship, shots, or asteroids across three rows", () => {
    const preview = renderAsciiPreview("spaceship", {
      slideTitle: "Bot Implementation",
      summary: "Message flow"
    }, 48, 18);

    expect(preview.split("\n")).toHaveLength(3);
    expect(preview).toMatch(/[=*x^>\-]/);
  });

  it("keeps destroyed asteroids gone after the impact flash", () => {
    let hit: { frame: number; row: number; column: number } | null = null;

    for (let frame = 0; frame < 96; frame += 1) {
      const preview = renderAsciiPreview("spaceship", {
        slideTitle: "Bot Implementation",
        summary: "Message flow"
      }, 48, frame);
      const rows = preview.split("\n");

      for (let row = 0; row < rows.length; row += 1) {
        const column = rows[row]?.indexOf("x") ?? -1;

        if (column !== -1) {
          hit = { frame, row, column };
          break;
        }
      }

      if (hit) {
        break;
      }
    }

    expect(hit).not.toBeNull();

    const aftermath = renderAsciiPreview("spaceship", {
      slideTitle: "Bot Implementation",
      summary: "Message flow"
    }, 48, (hit?.frame ?? 0) + 3);

    expect(characterAt(aftermath, hit?.row ?? 0, hit?.column ?? 0)).not.toBe("*");
  });

  it("shows a crash when an asteroid reaches the ship", () => {
    let crashFrame: number | null = null;

    for (let frame = 0; frame < 160; frame += 1) {
      const preview = renderAsciiPreview("spaceship", {
        slideTitle: "Bot Implementation",
        summary: "Message flow"
      }, 48, frame);

      if (preview.includes("XXX")) {
        crashFrame = frame;
        expect(preview).not.toContain("=^>");
        break;
      }
    }

    expect(crashFrame).not.toBeNull();
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

  it("renders pulse as a full-width oscilloscope line with a readable spike", () => {
    const preview = renderAsciiPreview("pulse", {
      slideTitle: "Signal",
      summary: "Health pulse"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
    expect(preview).toMatch(/^[ _\/\\\n]+$/);
    expect(preview).toMatch(/[\/\\]/);
    expect(preview.split("\n")[0]?.trim().length).toBeGreaterThan(0);
  });

  it("animates pulse across frames", () => {
    const start = renderAsciiPreview("pulse", {
      slideTitle: "Signal",
      summary: "Health pulse"
    }, 48, 0);
    const later = renderAsciiPreview("pulse", {
      slideTitle: "Signal",
      summary: "Health pulse"
    }, 48, 8);

    expect(later).not.toBe(start);
  });

  it("renders waves as a full-width band with repeating wave glyphs", () => {
    const preview = renderAsciiPreview("waves", {
      slideTitle: "Ocean",
      summary: "Motion"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
    expect(preview).toMatch(/^[~_\-\/\\\n]+$/);
    expect(preview).toContain("~");
  });

  it("animates waves across frames", () => {
    const start = renderAsciiPreview("waves", {
      slideTitle: "Ocean",
      summary: "Motion"
    }, 48, 0);
    const later = renderAsciiPreview("waves", {
      slideTitle: "Ocean",
      summary: "Motion"
    }, 48, 8);

    expect(later).not.toBe(start);
  });

  it("renders scanline as a full-width sweep with a highlighted zone", () => {
    const preview = renderAsciiPreview("scanline", {
      slideTitle: "Scanner",
      summary: "Sweep"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
    expect(preview).toMatch(/^[.\-=_\n]+$/);
    expect(preview).toContain("=");
  });

  it("animates scanline across frames", () => {
    const start = renderAsciiPreview("scanline", {
      slideTitle: "Scanner",
      summary: "Sweep"
    }, 48, 0);
    const later = renderAsciiPreview("scanline", {
      slideTitle: "Scanner",
      summary: "Sweep"
    }, 48, 8);

    expect(later).not.toBe(start);
  });

  it("renders equalizer as bar stacks with varying heights", () => {
    const preview = renderAsciiPreview("equalizer", {
      slideTitle: "Audio",
      summary: "Levels"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
    expect(preview).toMatch(/^[.:!|\n]+$/);
    expect(preview).toContain("|");
    expect(preview).toContain("!");
  });

  it("animates equalizer across frames", () => {
    const start = renderAsciiPreview("equalizer", {
      slideTitle: "Audio",
      summary: "Levels"
    }, 48, 0);
    const later = renderAsciiPreview("equalizer", {
      slideTitle: "Audio",
      summary: "Levels"
    }, 48, 6);

    expect(later).not.toBe(start);
  });

  it("renders signal as directional packets moving across fixed channels", () => {
    const preview = renderAsciiPreview("signal", {
      slideTitle: "Transport",
      summary: "Packets"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
    expect(preview).toMatch(/^[\-=*>\n]+$/);
    expect(preview).toMatch(/[>*]/);
  });

  it("animates signal across frames", () => {
    const start = renderAsciiPreview("signal", {
      slideTitle: "Transport",
      summary: "Packets"
    }, 48, 0);
    const later = renderAsciiPreview("signal", {
      slideTitle: "Transport",
      summary: "Packets"
    }, 48, 6);

    expect(later).not.toBe(start);
  });

  it("renders radar as a scanning sweep with echoes", () => {
    const preview = renderAsciiPreview("radar", {
      slideTitle: "Radar",
      summary: "Sweep"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
    expect(preview).toMatch(/^[.=\/\\|*\n]+$/);
    expect(preview).toContain("*");
    expect(preview).toContain("=");
  });

  it("animates radar across frames", () => {
    const start = renderAsciiPreview("radar", {
      slideTitle: "Radar",
      summary: "Sweep"
    }, 48, 0);
    const later = renderAsciiPreview("radar", {
      slideTitle: "Radar",
      summary: "Sweep"
    }, 48, 8);

    expect(later).not.toBe(start);
  });

  it("renders skyline as a city silhouette with lit structures", () => {
    const preview = renderAsciiPreview("skyline", {
      slideTitle: "City",
      summary: "Night"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
    expect(preview).toMatch(/^[ _.\[\]\|\n]+$/);
    expect(preview).toContain("_");
    expect(preview).toMatch(/[\[\]|]/);
  });

  it("animates skyline across frames", () => {
    const start = renderAsciiPreview("skyline", {
      slideTitle: "City",
      summary: "Night"
    }, 48, 0);
    const later = renderAsciiPreview("skyline", {
      slideTitle: "City",
      summary: "Night"
    }, 48, 8);

    expect(later).not.toBe(start);
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

  it("renders conveyor as moving boxed payloads on rails", () => {
    const preview = renderAsciiPreview("conveyor", {
      slideTitle: "Factory",
      summary: "Flow"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
    expect(preview).toMatch(/^[=\-\[\]>\n]+$/);
    expect(preview).toContain("[");
    expect(preview).toContain(">");
  });

  it("animates conveyor across frames", () => {
    const start = renderAsciiPreview("conveyor", {
      slideTitle: "Factory",
      summary: "Flow"
    }, 48, 0);
    const later = renderAsciiPreview("conveyor", {
      slideTitle: "Factory",
      summary: "Flow"
    }, 48, 6);

    expect(later).not.toBe(start);
  });

  it("renders constellation as linked stars across the banner", () => {
    const preview = renderAsciiPreview("constellation", {
      slideTitle: "Space",
      summary: "Map"
    }, 48, 18);

    expectThreeFullWidthRows(preview, 48);
    expect(preview).toMatch(/^[ .*\/\\\-\n]+$/);
    expect(preview).toContain("*");
    expect(preview).toMatch(/[\/\\-]/);
  });

  it("animates constellation across frames", () => {
    const start = renderAsciiPreview("constellation", {
      slideTitle: "Space",
      summary: "Map"
    }, 48, 0);
    const later = renderAsciiPreview("constellation", {
      slideTitle: "Space",
      summary: "Map"
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
