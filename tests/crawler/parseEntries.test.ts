import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseEntries } from "../../src/crawler/parseEntries";

describe("parseEntries", () => {
    //Test group for real fixture
    describe("with the real front page fixture", () => {
        const html = readFileSync("tests/fixtures/hn-frontpage.html", "utf-8");
        const entries = parseEntries(html);

        it("returns 30 entries", () => {
            expect(entries.length).toBe(30);
        });

        it("returns ranks from 1 to 30 in order", () => {
            const ranks = entries.map((entry) => entry.rank);
            const expectedRanks = Array.from({ length: 30 }, (_, i) => i + 1);

            expect(ranks).toEqual(expectedRanks);
        });

        it("returns non-empty titles", () => {
            const titles = entries.map((entry) => entry.title.trim());
            expect(titles).not.toContain("");
        });
        it("Points and comments are greater than or equal to zero", () => {
            for (let i = 0; i < entries.length; i++) {
                expect(entries[i].points).toBeGreaterThanOrEqual(0);
                expect(entries[i].comments).toBeGreaterThanOrEqual(0);
            }
        });
    });

    //Test group for hand-written edge cases
    describe("with hand-written edge cases", () => {
        function buildEntryHtml(rank: number, title: string, subline: string): string {
            return `
                <table>
                    <tr class="athing submission" id="${rank}">
                    <td class="title"><span class="rank">${rank}.</span></td>
                    <td class="title"><span class="titleline"><a href="https://example.com">${title}</a></span></td>
                    </tr>
                    <tr>
                    <td class="subtext"><span class="subline">${subline}</span></td>
                    </tr>
                </table>
             `;
        }

        it("returns 0 points and 0 comments for job posts", () => {
            const html = buildEntryHtml(
                5,
                "Acme (YC W24) Is Hiring Engineers",
                `<span class="age"><a href="item?id=5">1 hour ago</a></span> | <a href="hide?id=5">hide</a>`
            );

            expect(parseEntries(html)).toEqual([
                { rank: 5, title: "Acme (YC W24) Is Hiring Engineers", points: 0, comments: 0 },
            ]);
        });
        it("returns 0 comments when the link says discuss", () => {
            const html = buildEntryHtml(
                10,
                "Ask HN: What are you working on?",
                `<span class="score" id="score_10">12 points</span> by <a href="user?id=andsoitis" class="hnuser">andsoitis</a> <span class="age"><a href="item?id=10">1 hour ago</a></span> | <a href="hide?id=10">hide</a> | <a href="item?id=10">discuss</a>`
            );

            expect(parseEntries(html)).toEqual([
                { rank: 10, title: "Ask HN: What are you working on?", points: 12, comments: 0 },
            ]);
        });
        it("singular points and comments", () => {
            const html = buildEntryHtml(
                15,
                "Rust is a systems programming language",
                `<span class="score" id="score_15">1 point</span> by <a href="user?id=ferris" class="hnuser">ferris</a> <span class="age"><a href="item?id=15">3 hours ago</a></span> | <a href="hide?id=15">hide</a> | <a href="item?id=15">1&nbsp;comment</a>`
            );

            expect(parseEntries(html)).toEqual([
                { rank: 15, title: "Rust is a systems programming language", points: 1, comments: 1 },
            ]);
        });
        it("parses comment counts separated by &nbsp;)", () => {
            const html = buildEntryHtml(
                20,
                "Python | Go — Rust & C",
                `<span class="score" id="score_20">123 points</span> by <a href="user?id=gopher" class="hnuser">gopher</a> <span class="age"><a href="item?id=20">4 hours ago</a></span> | <a href="hide?id=20">hide</a> | <a href="item?id=20">45&nbsp;comments</a>`
            );

            expect(parseEntries(html)).toEqual([
                { rank: 20, title: "Python | Go — Rust & C", points: 123, comments: 45 },
            ]);
        });

    });
});