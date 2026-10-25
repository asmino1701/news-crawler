import { load } from "cheerio";
import type { Entry } from "../domain/entry";

const FIRST_NUMBER = /\d+/;

// Helper: returns the first number in a text, or 0 if there is none
function extractNumber(text: string): number {
    const match = text.match(FIRST_NUMBER);
    return match ? parseInt(match[0], 10) : 0;
}

// Main function: full front page HTML → list of entries
export function parseEntries(html: string): Entry[] {
    const $ = load(html);

    return $("tr.athing")
        .map((_, row) => {
            const $row = $(row);
            const $subline = $row.next().find(".subline");

            const rank = extractNumber($row.find(".rank").text());
            const title = $row.find(".titleline > a").first().text().trim();
            const points = extractNumber($subline.find(".score").text());
            const commentsText = $subline.find("a:contains('comment')").text();
            const comments = extractNumber(commentsText);

            return { rank, title, points, comments };
        })
        .get();
}
