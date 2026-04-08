import { describe, expect, it } from "vitest";

import { renderAsciiPreview } from "./ascii.ts";

function characterAt(preview: string, row: number, column: number): string {
  return preview.split("\n")[row]?.[column] ?? " ";
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
});
