import { describe, it, expect } from "vitest";
import type { Entry } from "../../src/domain/entry";
import { applyFilter, findFilter, LONG_TITLES, SHORT_TITLES } from "../../src/domain/filters";

const ENTRIES: Entry[] = [
    { rank: 1, title: "Show HN: I built a tiny compiler in Rust", points: 50, comments: 10 },
    { rank: 2, title: "SpeedCrunch 1.1", points: 50, comments: 8 },
    { rank: 3, title: "Small Programs and Languages", points: 12, comments: 0 },
    { rank: 4, title: "America Has Lost 200k of Jobs in Media", points: 5, comments: 30 },
    { rank: 5, title: "This is - a self-explained example", points: 80, comments: 3 },
    { rank: 6, title: "I Built a Stereo Vision Board for Hardware Hackers", points: 8, comments: 10 },
];

describe("applyFilter", () => {
    describe("with LONG_TITLES", () => {
        it("keeps only titles with more than five words", () => {
            const ranks = applyFilter(ENTRIES, LONG_TITLES).map((entry) => entry.rank);

            expect(ranks.toSorted((a, b) => a - b)).toEqual([1, 4, 6]);
        });

        it("filters and sorts by comments high to low", () => {
            const comments = applyFilter(ENTRIES, LONG_TITLES).map((entry) => entry.comments);
            expect(comments).toEqual([30, 10, 10]);
        });

        it("resolves ties by rank", () => {
            const ranks = applyFilter(ENTRIES, LONG_TITLES).map((entry) => entry.rank);
            expect(ranks).toEqual([4, 1, 6]);
        });
    });

    describe("with SHORT_TITLES", () => {
        it("keeps only titles with five words or less", () => {
            const ranks = applyFilter(ENTRIES, SHORT_TITLES).map((entry) => entry.rank);

            expect(ranks.toSorted((a, b) => a - b)).toEqual([2, 3, 5]);
        });

        it("filters and sorts by points high to low", () => {
            const points = applyFilter(ENTRIES, SHORT_TITLES).map((entry) => entry.points);
            expect(points).toEqual([80, 50, 12]);
        });

    });

});

describe("findFilter", () => {
    it("returns the long titles filter by its name", () => {
        expect(findFilter("long-titles")).toBe(LONG_TITLES);
    });

    it("returns the short titles filter by its name", () => {
        expect(findFilter("short-titles")).toBe(SHORT_TITLES);
    });

    it("returns undefined for an unknown filter name", () => {
        expect(findFilter("medium-titles")).toBeUndefined();
    });
});