import type { CrawlerService } from "../crawler/crawlerService";
import { FILTERS, findFilter } from "../domain/filters";
import { toErrorMessage } from "../shared/errors";
import type { UsageRepository } from "../usage/usageLog";
import { HTTP_STATUS } from "./httpStatus";

const VALID_FILTER_NAMES = FILTERS.map((filter) => filter.name).join(", ");
const HTML_CONTENT_TYPE = "text/html; charset=utf-8";

export type RequestHandlerDependencies = {
    readonly crawlerService: CrawlerService;
    readonly usageRepository: UsageRepository;
    readonly indexHtml: string;
};

export type RequestHandler = (request: Request) => Promise<Response>;

function json(body: unknown, status: number = HTTP_STATUS.OK): Response {
    return Response.json(body, { status });
}

export function createRequestHandler({
    crawlerService,
    usageRepository,
    indexHtml,
}: RequestHandlerDependencies): RequestHandler {
    async function getIndex(): Promise<Response> {
        return new Response(indexHtml, { headers: { "Content-Type": HTML_CONTENT_TYPE } });
    }

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
        ["/", getIndex],
        ["/entries", getEntries],
        ["/usage", getUsage],
    ]);

    return async (request) => {
        const url = new URL(request.url);
        const route = request.method === "GET" ? getRoutes.get(url.pathname) : undefined;

        return route ? route(url) : json({ error: "Not found" }, HTTP_STATUS.NOT_FOUND);
    };
}
