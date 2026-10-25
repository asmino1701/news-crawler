import { describe, it, expect, vi, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { RequestHandler } from "../../src/http/requestHandler";
import { toNodeListener } from "../../src/http/nodeAdapter";

describe("toNodeListener", () => {
    let server: Server;

    afterEach(() => {
        server.close();
    });

    async function serve(handle: RequestHandler): Promise<string> {
        server = createServer(toNodeListener(handle));
        server.listen(0, "127.0.0.1");
        await once(server, "listening");
        const { port } = server.address() as AddressInfo;

        return `http://127.0.0.1:${port}`;
    }

    it("passes the request method and full URL to the handler", async () => {
        const handle = vi.fn<RequestHandler>().mockResolvedValue(Response.json([]));
        const baseUrl = await serve(handle);

        await fetch(`${baseUrl}/entries?filter=long-titles`);

        const request = handle.mock.calls[0][0];
        expect(request.method).toBe("GET");
        expect(request.url).toBe(`${baseUrl}/entries?filter=long-titles`);
    });

    it("writes the status, headers and body of the handler's response", async () => {
        const baseUrl = await serve(async () => Response.json({ error: "Not found" }, { status: 404 }));

        const response = await fetch(`${baseUrl}/comments`);

        expect(response.status).toBe(404);
        expect(response.headers.get("Content-Type")).toBe("application/json");
        await expect(response.json()).resolves.toEqual({ error: "Not found" });
    });

    it("responds 500 with the error message when the handler throws", async () => {
        const baseUrl = await serve(async () => {
            throw new Error("database is locked");
        });

        const response = await fetch(`${baseUrl}/usage`);

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ error: "database is locked" });
    });
});
