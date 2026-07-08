import { describe, expect, it } from "vitest";
import { calculateScore } from "@/lib/results/scoring";

describe("calculateScore", () => {
  it("calculates percentage score", () => {
    expect(calculateScore(8, 10)).toBe(80);
  });
});
