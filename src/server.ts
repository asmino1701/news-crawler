import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createCrawlerService } from "./crawler/crawlerService";
import { fetchFrontPage } from "./crawler/fetchFrontPage";
import { toNodeListener } from "./http/nodeAdapter";
import { createRequestHandler } from "./http/requestHandler";
import { createSqliteUsageRepository } from "./usage/sqliteUsageRepository";

const DEFAULT_PORT = 3000;
const DEFAULT_DATABASE_PATH = "usage.db";

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const databasePath = process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH;

const usageRepository = createSqliteUsageRepository(new DatabaseSync(databasePath));
const crawlerService = createCrawlerService({ fetchPage: fetchFrontPage, usageRepository, now: Date.now });
const handle = createRequestHandler({ crawlerService, usageRepository });

createServer(toNodeListener(handle)).listen(port, () => {
    console.log(`news-crawler listening on http://localhost:${port}`);
});
