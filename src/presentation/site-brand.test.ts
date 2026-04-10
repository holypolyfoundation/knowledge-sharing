import { describe, expect, it } from "vitest";

import {
  SITE_DOCUMENT_TITLE_DEFAULT,
  formatSlideDocumentTitle,
  formatTopicListDocumentTitle
} from "./site-brand.ts";

describe("site-brand", () => {
  it("uses a symbol-only default tab title", () => {
    expect(SITE_DOCUMENT_TITLE_DEFAULT).toBe("[]");
  });

  it("formats topic index titles as digit count only", () => {
    expect(formatTopicListDocumentTitle(3)).toBe("[03]");
  });

  it("formats slide titles as slide codes only", () => {
    expect(formatSlideDocumentTitle(0, 2)).toBe("[S01/02]");
  });
});
