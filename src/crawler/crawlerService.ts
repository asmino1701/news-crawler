import type { Entry } from "../domain/entry";
import { applyFilter, type EntryFilter } from "../domain/filters";
import type { UsageRepository } from "../usage/usageLog";
import { parseEntries } from "./parseEntries";

const MAX_ENTRIES = 30;

export type CrawlerDependencies = {
    readonly fetchPage: () => Promise<string>;
    readonly usageRepository: UsageRepository;
    readonly now: () => number;
};

export type CrawlerService = {
    readonly crawl: (filter: EntryFilter) => Promise<Entry[]>;
};

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function createCrawlerService({ fetchPage, usageRepository, now }: CrawlerDependencies): CrawlerService {
    function recordUsage(filter: EntryFilter, startMs: number, resultCount: number, error: string | null): void {
        usageRepository.record({
            requestedAt: new Date(startMs).toISOString(),
            filter: filter.name,
            durationMs: now() - startMs,
            resultCount,
            error,
        });
    }

    async function crawlOrRecordFailure(filter: EntryFilter, startMs: number): Promise<Entry[]> {
        try {
            const html = await fetchPage();
            return applyFilter(parseEntries(html).slice(0, MAX_ENTRIES), filter);
        } catch (error) {
            recordUsage(filter, startMs, 0, toErrorMessage(error));
            throw error;
        }
    }

    return {
        crawl: async (filter) => {
            const startMs = now();
            const entries = await crawlOrRecordFailure(filter, startMs);

            recordUsage(filter, startMs, entries.length, null);
            return entries;
        },
    };
}
