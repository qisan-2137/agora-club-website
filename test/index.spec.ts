import {
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../worker";

describe("Agora worker", () => {
	it("serves the health endpoint in unit mode", async () => {
		const request = new Request<unknown, IncomingRequestCfProperties>(
			"http://example.com/api/health"
		);
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, {} as Env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ ok: true });
	});

	it("serves the health endpoint in integration mode", async () => {
		const response = await SELF.fetch("http://example.com/api/health");
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ ok: true });
	});
});
