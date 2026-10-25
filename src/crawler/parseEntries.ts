import { load } from "cheerio";
import type { Entry } from "../domain/entry";

const FIRST_NUMBER = /\d+/;

// Función auxiliar: saca el primer número de un texto, o 0 si no hay
function extractNumber(text: string): number {
    const match = text.match(FIRST_NUMBER);
    return match ? parseInt(match[0], 10) : 0;
}

// Función principal: HTML completo → lista de Entry
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
