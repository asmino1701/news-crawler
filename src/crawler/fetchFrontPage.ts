export function fetchFrontPage(fetch: typeof globalThis.fetch): Promise<string> {
    return fetch("https://news.ycombinator.com/")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch front page: ${response.status} ${response.statusText}`);
            }
            return response.text();
        });
}