import { describe, it, expect } from "vitest";
import { countWords } from "../../src/domain/countWords";

describe("countWords", () => {
  it("counts the example from the specification", () => {
    expect(countWords("This is - a self-explained example")).toBe(5);
  });

  it("counts words in a plain title", () => {
    expect(countWords("Rust is a systems programming language")).toBe(6);
  });

  it("ignores tokens made only of symbols", () => {
    expect(countWords("Python | Go — Rust & C")).toBe(4);
  });

  it("counts words with attached punctuation", () => {
    expect(countWords("Ask HN: What are you working on?")).toBe(7);
  });

  it("ignores leading, trailing and repeated whitespace", () => {
    expect(countWords("  Hello    world  ")).toBe(2);
  });

  it("counts numbers as words", () => {
    expect(countWords("Top 10 tools of 2026")).toBe(5);
  });

  it("counts words with non-English letters", () => {
    expect(countWords("Diseño de software en Quito")).toBe(5);
  });

  it.each(["", "   ", " - | "])("returns 0 for %j", (title) => {
    expect(countWords(title)).toBe(0);
  });
});