import type { CrawlerService } from "../crawler/crawlerService";
import { FILTERS, findFilter } from "../domain/filters";
import { toErrorMessage } from "../shared/errors";
import type { UsageRepository } from "../usage/usageLog";
import { HTTP_STATUS } from "./httpStatus";

const VALID_FILTER_NAMES = FILTERS.map((filter) => filter.name).join(", ");

export type RequestHandlerDependencies = {
    readonly crawlerService: CrawlerService;
    readonly usageRepository: UsageRepository;
};

export type RequestHandler = (request: Request) => Promise<Response>;

function json(body: unknown, status: number = HTTP_STATUS.OK): Response {
    return Response.json(body, { status });
}

export function createRequestHandler({ crawlerService, usageRepository }: RequestHandlerDependencies): RequestHandler {
    async function getEntries(url: URL): Promise<Response> {
        const filter = findFilter(url.searchParams.get("filter") ?? "");

        if (!filter) {
            return json({ error: `Missing or invalid filter. Valid filters: ${VALID_FILTER_NAMES}` }, HTTP_STATUS.BAD_REQUEST);
        }

        try {
            return json(await crawlerService.crawl(filter));
        } catch (error) {
            return json({ error: toErrorMessage(error) }, HTTP_STATUS.BAD_GATEWAY);
        }
    }

    async function getUsage(): Promise<Response> {
        return json(usageRepository.findAll());
    }

    const getRoutes: ReadonlyMap<string, (url: URL) => Promise<Response>> = new Map([
        ["/entries", getEntries],
        ["/usage", getUsage],
    ]);

    return async (request) => {
        const url = new URL(request.url);
        const route = request.method === "GET" ? getRoutes.get(url.pathname) : undefined;

        return route ? route(url) : json({ error: "Not found" }, HTTP_STATUS.NOT_FOUND);
    };
}
