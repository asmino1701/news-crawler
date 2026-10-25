import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import type { UsageLog } from "../../src/usage/usageLog";
import { createSqliteUsageRepository } from "../../src/usage/sqliteUsageRepository";

const SUCCESSFUL_LOG: UsageLog = {
    requestedAt: "2026-10-24T14:05:12.345Z",
    filter: "long-titles",
    durationMs: 412,
    resultCount: 17,
    error: null,
};

const FAILED_LOG: UsageLog = {
    requestedAt: "2026-10-24T14:06:40.001Z",
    filter: "short-titles",
    durationMs: 5003,
    resultCount: 0,
    error: "Failed to fetch front page: 503 Service Unavailable",
};

describe("createSqliteUsageRepository", () => {
    let db: DatabaseSync;

    beforeEach(() => {
        db = new DatabaseSync(":memory:");
    });

    it("returns no logs when nothing has been recorded", () => {
        const repository = createSqliteUsageRepository(db);

        expect(repository.findAll()).toEqual([]);
    });

    it("returns a recorded log with all its fields", () => {
        const repository = createSqliteUsageRepository(db);

        repository.record(SUCCESSFUL_LOG);

        expect(repository.findAll()).toEqual([SUCCESSFUL_LOG]);
    });

    it("keeps the error message of a failed request", () => {
        const repository = createSqliteUsageRepository(db);

        repository.record(FAILED_LOG);

        expect(repository.findAll()).toEqual([FAILED_LOG]);
    });

    it("returns logs in the order they were recorded", () => {
        const repository = createSqliteUsageRepository(db);

        repository.record(FAILED_LOG);
        repository.record(SUCCESSFUL_LOG);

        expect(repository.findAll()).toEqual([FAILED_LOG, SUCCESSFUL_LOG]);
    });

    it("persists logs in the database across repository instances", () => {
        createSqliteUsageRepository(db).record(SUCCESSFUL_LOG);

        const reopened = createSqliteUsageRepository(db);

        expect(reopened.findAll()).toEqual([SUCCESSFUL_LOG]);
    });
});
