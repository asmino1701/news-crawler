import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { toErrorMessage } from "../shared/errors";
import { HTTP_STATUS } from "./httpStatus";
import type { RequestHandler } from "./requestHandler";

// Only method and URL are forwarded: the API has GET routes only, so request bodies are ignored.
function toRequest(req: IncomingMessage): Request {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    return new Request(url, { method: req.method });
}

async function respond(handle: RequestHandler, req: IncomingMessage): Promise<Response> {
    try {
        return await handle(toRequest(req));
    } catch (error) {
        return Response.json({ error: toErrorMessage(error) }, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
    }
}

async function writeResponse(res: ServerResponse, response: Response): Promise<void> {
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
}

export function toNodeListener(handle: RequestHandler): RequestListener {
    return async (req, res) => {
        await writeResponse(res, await respond(handle, req));
    };
}
