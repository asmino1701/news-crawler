const FRONT_PAGE_URL = "https://news.ycombinator.com/";
const USER_AGENT = "news-crawler/1.0 (+https://github.com/asmino1701/news-crawler)";
const TIMEOUT_MS = 5000;

export async function fetchFrontPage(fetchFn: typeof fetch = fetch): Promise<string> {
    const response = await fetchFn(FRONT_PAGE_URL, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch front page: ${response.status} ${response.statusText}`);
    }

    return response.text();
}
