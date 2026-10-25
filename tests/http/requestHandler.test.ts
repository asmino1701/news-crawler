import { describe, it, expect, vi } from "vitest";
import type { Entry } from "../../src/domain/entry";
import type { UsageLog, UsageRepository } from "../../src/usage/usageLog";
import type { CrawlerService } from "../../src/crawler/crawlerService";
import { LONG_TITLES, SHORT_TITLES } from "../../src/domain/filters";
import { createRequestHandler } from "../../src/http/requestHandler";

const BASE_URL = "http://localhost";

const ENTRIES: Entry[] = [
    { rank: 3, title: "America Has Lost 200k of Jobs in Media", points: 5, comments: 30 },
    { rank: 1, title: "Show HN: I built a tiny compiler in Rust", points: 50, comments: 10 },
];

const USAGE_LOGS: UsageLog[] = [
    {
        requestedAt: "2026-10-25T14:05:12.345Z",
        filter: "long-titles",
        durationMs: 412,
        resultCount: 2,
        error: null,
    },
    {
        requestedAt: "2026-10-25T14:06:40.001Z",
        filter: "short-titles",
        durationMs: 5003,
        resultCount: 0,
        error: "Failed to fetch front page: 503 Service Unavailable",
    },
];

const INDEX_HTML = "<!doctype html><title>news-crawler</title>";

function createFakes(crawl: CrawlerService["crawl"] = vi.fn().mockResolvedValue(ENTRIES)) {
    const crawlerService: CrawlerService = { crawl };
    const usageRepository: UsageRepository = { record: vi.fn(), findAll: () => USAGE_LOGS };
    const handle = createRequestHandler({ crawlerService, usageRepository, indexHtml: INDEX_HTML });

    return { handle, crawlerService };
}

function get(path: string): Request {
    return new Request(`${BASE_URL}${path}`);
}

describe("createRequestHandler", () => {
    describe("GET /entries", () => {
        it.each([LONG_TITLES, SHORT_TITLES])("crawls with the $name filter", async (filter) => {
            const { handle, crawlerService } = createFakes();

            await handle(get(`/entries?filter=${filter.name}`));

            expect(crawlerService.crawl).toHaveBeenCalledExactlyOnceWith(filter);
        });

        it("responds 200 with the crawled entries as JSON", async () => {
            const { handle } = createFakes();

            const response = await handle(get("/entries?filter=long-titles"));

            expect(response.status).toBe(200);
            expect(response.headers.get("Content-Type")).toBe("application/json");
            await expect(response.json()).resolves.toEqual(ENTRIES);
        });

        it.each(["/entries?filter=medium-titles", "/entries"])(
            "responds 400 listing the valid filters for %s without crawling",
            async (path) => {
                const { handle, crawlerService } = createFakes();

                const response = await handle(get(path));
                const body = (await response.json()) as { error: string };

                expect(response.status).toBe(400);
                expect(body.error).toContain("long-titles, short-titles");
                expect(crawlerService.crawl).not.toHaveBeenCalled();
            },
        );

        it("responds 502 with the error message when the crawl fails", async () => {
            const crawl = vi.fn().mockRejectedValue(new Error("Failed to fetch front page: 503 Service Unavailable"));
            const { handle } = createFakes(crawl);

            const response = await handle(get("/entries?filter=short-titles"));

            expect(response.status).toBe(502);
            await expect(response.json()).resolves.toEqual({
                error: "Failed to fetch front page: 503 Service Unavailable",
            });
        });
    });

    describe("GET /", () => {
        it("responds 200 with the web page as HTML", async () => {
            const { handle } = createFakes();

            const response = await handle(get("/"));

            expect(response.status).toBe(200);
            expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
            await expect(response.text()).resolves.toBe(INDEX_HTML);
        });
    });

    describe("GET /usage", () => {
        it("responds 200 with the recorded usage logs as JSON", async () => {
            const { handle } = createFakes();

            const response = await handle(get("/usage"));

            expect(response.status).toBe(200);
            await expect(response.json()).resolves.toEqual(USAGE_LOGS);
        });
    });

    it.each([
        ["an unknown path", get("/comments")],
        ["a non-GET method", new Request(`${BASE_URL}/usage`, { method: "POST" })],
    ])("responds 404 for %s", async (_, request) => {
        const { handle } = createFakes();

        const response = await handle(request);

        expect(response.status).toBe(404);
    });
});
