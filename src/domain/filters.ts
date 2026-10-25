import { countWords } from "./countWords";
import { Entry } from "./entry";

type EntryFilter = (entry: Entry) => boolean;

export function applyFilter(entries: readonly Entry[], filter: EntryFilter): Entry[] {
    return entries.filter(filter);
}

export const LONG_TITLES: EntryFilter = (entry) => countWords(entry.title) > 5; { }

export const SHORT_TITLES: EntryFilter = (entry) => countWords(entry.title) <= 5;