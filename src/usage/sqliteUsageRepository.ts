import type { DatabaseSync } from "node:sqlite";
import type { UsageLog, UsageRepository } from "./usageLog";

const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requested_at TEXT NOT NULL,
        filter TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        result_count INTEGER NOT NULL,
        error TEXT
    )`;

const INSERT_SQL = `
    INSERT INTO usage_logs (requested_at, filter, duration_ms, result_count, error)
    VALUES (:requestedAt, :filter, :durationMs, :resultCount, :error)`;

const SELECT_ALL_SQL = `
    SELECT requested_at AS requestedAt, filter, duration_ms AS durationMs,
           result_count AS resultCount, error
    FROM usage_logs
    ORDER BY id`;

export function createSqliteUsageRepository(db: DatabaseSync): UsageRepository {
    db.exec(CREATE_TABLE_SQL);
    const insert = db.prepare(INSERT_SQL);
    const selectAll = db.prepare(SELECT_ALL_SQL);

    return {
        record: (log) => {
            insert.run(log);
        },
        findAll: () => selectAll.all() as unknown as readonly UsageLog[],
    };
}
