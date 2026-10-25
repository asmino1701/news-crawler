import { describe, it, expect, vi } from "vitest";
import { fetchFrontPage } from "../../src/crawler/fetchFrontPage";

describe("fetchFrontPage", () => {
    it("returns the page HTML when the request succeeds", async () => {
        const fakeFetch = vi.fn().mockResolvedValue(new Response("<html>ok</html>", { status: 200 }));

        await expect(fetchFrontPage(fakeFetch)).resolves.toBe("<html>ok</html>");
    });
    it("throws an error when the request fails", async () => {
        const fakeFetch = vi.fn().mockResolvedValue(new Response("Service Unavailable", { status: 503, statusText: "Service Unavailable" }));
        await expect(fetchFrontPage(fakeFetch)).rejects.toThrow(/503/);
    });

    it("sends an identifying User-Agent header", async () => {
        const fakeFetch = vi.fn().mockResolvedValue(new Response("<html>ok</html>", { status: 200 }));
        await fetchFrontPage(fakeFetch);
        expect(fakeFetch).toHaveBeenCalledWith("https://news.ycombinator.com/", expect.objectContaining({
            headers: expect.objectContaining({
                "User-Agent": expect.stringContaining("news-crawler")
            }),
        }));
    });

    it("passes a timeout signal to the request", async () => {
        const fakeFetch = vi.fn().mockResolvedValue(new Response("<html>ok</html>", { status: 200 }));
        await fetchFrontPage(fakeFetch);
        expect(fakeFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            signal: expect.any(AbortSignal),
        }));
    });
});