import { describe, it, expect, vi } from "vitest";
import type { Entry } from "../../src/domain/entry";
import type { UsageRepository } from "../../src/usage/usageLog";
import { LONG_TITLES, SHORT_TITLES } from "../../src/domain/filters";
import { createCrawlerService } from "../../src/crawler/crawlerService";

const START_MS = Date.parse("2026-10-25T14:05:12.345Z");
const DURATION_MS = 412;

const ENTRIES: Entry[] = [
    { rank: 1, title: "Show HN: I built a tiny compiler in Rust", points: 50, comments: 10 },
    { rank: 2, title: "SpeedCrunch 1.1", points: 50, comments: 8 },
    { rank: 3, title: "America Has Lost 200k of Jobs in Media", points: 5, comments: 30 },
    { rank: 4, title: "This is - a self-explained example", points: 80, comments: 3 },
];

function buildFrontPageHtml(entries: readonly Entry[]): string {
    const rows = entries.map(({ rank, title, points, comments }) => `
        <tr class="athing submission" id="${rank}">
            <td class="title"><span class="rank">${rank}.</span></td>
            <td class="title"><span class="titleline"><a href="https://example.com/${rank}">${title}</a></span></td>
        </tr>
        <tr>
            <td class="subtext"><span class="subline"><span class="score" id="score_${rank}">${points} points</span> | <a href="item?id=${rank}">${comments}&nbsp;comments</a></span></td>
        </tr>`);

    return `<table>${rows.join("")}</table>`;
}

function createFakes(fetchPage: () => Promise<string>) {
    const usageRepository: UsageRepository = { record: vi.fn(), findAll: () => [] };
    const now = vi.fn().mockReturnValueOnce(START_MS).mockReturnValueOnce(START_MS + DURATION_MS);
    const service = createCrawlerService({ fetchPage, usageRepository, now });

    return { service, usageRepository, fetchPage };
}

describe("createCrawlerService", () => {
    it("returns the entries that match the filter in the filter's order", async () => {
        const { service } = createFakes(async () => buildFrontPageHtml(ENTRIES));

        await expect(service.crawl(SHORT_TITLES)).resolves.toEqual([ENTRIES[3], ENTRIES[1]]);
    });

    it("ignores entries beyond the first 30", async () => {
        const entries = Array.from({ length: 31 }, (_, i): Entry => ({
            rank: i + 1,
            title: `Story number ${i + 1} on the front page`,
            points: i,
            comments: i,
        }));
        const { service } = createFakes(async () => buildFrontPageHtml(entries));

        const ranks = (await service.crawl(LONG_TITLES)).map((entry) => entry.rank);

        expect(ranks).toHaveLength(30);
        expect(ranks).not.toContain(31);
    });

    it("fetches the front page once per crawl", async () => {
        const fetchPage = vi.fn().mockResolvedValue(buildFrontPageHtml(ENTRIES));
        const { service } = createFakes(fetchPage);

        await service.crawl(LONG_TITLES);

        expect(fetchPage).toHaveBeenCalledOnce();
    });

    it("records the usage of a successful crawl", async () => {
        const { service, usageRepository } = createFakes(async () => buildFrontPageHtml(ENTRIES));

        await service.crawl(LONG_TITLES);

        expect(usageRepository.record).toHaveBeenCalledExactlyOnceWith({
            requestedAt: "2026-10-25T14:05:12.345Z",
            filter: "long-titles",
            durationMs: DURATION_MS,
            resultCount: 2,
            error: null,
        });
    });

    it("rethrows the error when fetching the front page fails", async () => {
        const failure = new Error("Failed to fetch front page: 503 Service Unavailable");
        const { service } = createFakes(async () => { throw failure; });

        await expect(service.crawl(SHORT_TITLES)).rejects.toBe(failure);
    });

    it("records the usage with the error message when fetching the front page fails", async () => {
        const { service, usageRepository } = createFakes(async () => {
            throw new Error("Failed to fetch front page: 503 Service Unavailable");
        });

        await service.crawl(SHORT_TITLES).catch(() => {});

        expect(usageRepository.record).toHaveBeenCalledExactlyOnceWith({
            requestedAt: "2026-10-25T14:05:12.345Z",
            filter: "short-titles",
            durationMs: DURATION_MS,
            resultCount: 0,
            error: "Failed to fetch front page: 503 Service Unavailable",
        });
    });
});
