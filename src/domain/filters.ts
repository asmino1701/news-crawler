import { countWords } from "./countWords";
import type { Entry } from "./entry";

const TITLE_WORD_LIMIT = 5;

export type EntryFilter = {
    readonly name: string;
    readonly predicate: (entry: Entry) => boolean;
    readonly sortBy: "comments" | "points";
};

export const LONG_TITLES: EntryFilter = {
    name: "long-titles",
    predicate: (entry) => countWords(entry.title) > TITLE_WORD_LIMIT,
    sortBy: "comments",
};

export const SHORT_TITLES: EntryFilter = {
    name: "short-titles",
    predicate: (entry) => countWords(entry.title) <= TITLE_WORD_LIMIT,
    sortBy: "points",
};

export const FILTERS: readonly EntryFilter[] = [LONG_TITLES, SHORT_TITLES];

export function findFilter(name: string): EntryFilter | undefined {
    return FILTERS.find((filter) => filter.name === name);
}

export function applyFilter(entries: readonly Entry[], filter: EntryFilter): Entry[] {
    return entries
        .filter(filter.predicate)
        .toSorted((a, b) => b[filter.sortBy] - a[filter.sortBy] || a.rank - b.rank);
}