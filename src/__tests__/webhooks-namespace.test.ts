/**
 * WebhooksNamespace / FantasyNamespace response mapping (RL-2074): the SDK must read the
 * keys the server actually sends (src/api/webhooks/index.ts, src/api/fantasy/index.ts).
 */
import { jest } from "@jest/globals";
import { WebhooksNamespace } from "../webhooks.js";
import { FantasyNamespace } from "../fantasy.js";
import type { HttpClient } from "../http.js";

type Call = { method: string; path: string; body?: unknown };

function fakeHttp(response: unknown): { http: HttpClient; calls: Call[] } {
  const calls: Call[] = [];
  const rec = (method: string) =>
    jest.fn(async (path: string, body?: unknown) => {
      calls.push({ method, path, body });
      return response;
    });
  const http = { get: rec("GET"), post: rec("POST"), patch: rec("PATCH"), delete: rec("DELETE") } as unknown as HttpClient;
  return { http, calls };
}

const endpoint = {
  webhookId: "wh_1",
  webhookUrl: "https://example.com/hook",
  webhookMethod: "post",
  seriesId: "f1",
  active: true,
  subscriptionTier: "live",
  feedCount: 1,
  subscriptions: [{ feedId: "events.race", seriesId: "f1", filters: {}, active: true, subscriptionTier: "live", consecutiveFailures: 0, autoDisabledAt: null, createdAt: "x", updatedAt: "x" }],
  createdAt: "x",
  updatedAt: "x",
};

describe("WebhooksNamespace", () => {
  it("get() reads data.endpoint", async () => {
    const { http, calls } = fakeHttp({ data: { endpoint } });
    const got = await new WebhooksNamespace(http).get("wh_1");
    expect(got.webhookId).toBe("wh_1");
    expect(got.subscriptions[0].feedId).toBe("events.race");
    expect(calls[0]).toMatchObject({ method: "GET", path: "/webhooks/wh_1" });
  });

  it("update() reads data.endpoint", async () => {
    const { http, calls } = fakeHttp({ data: { endpoint } });
    const got = await new WebhooksNamespace(http).update("wh_1", { active: false });
    expect(got.feedCount).toBe(1);
    expect(calls[0]).toMatchObject({ method: "PATCH", path: "/webhooks/wh_1", body: { active: false } });
  });

  it("list() requests shape=flat and reads data.webhooks", async () => {
    const { http, calls } = fakeHttp({ data: { webhooks: [{ webhookId: "wh_1", feedId: "events.race" }], total: 1, limit: 5, offset: 0 } });
    const got = await new WebhooksNamespace(http).list({ limit: 5 });
    expect(got.data).toHaveLength(1);
    expect(got.total).toBe(1);
    expect(calls[0].path).toBe("/webhooks?shape=flat&limit=5");
  });

  it("listEndpoints() reads grouped data.endpoints", async () => {
    const { http, calls } = fakeHttp({ data: { endpoints: [endpoint], total: 1, limit: 20, offset: 0 } });
    const got = await new WebhooksNamespace(http).listEndpoints();
    expect(got.data[0].webhookId).toBe("wh_1");
    expect(calls[0].path).toBe("/webhooks");
  });

  it("create() sends feedId for the single-feed form", async () => {
    const { http, calls } = fakeHttp({ data: { webhook: { webhookId: "wh_1" }, webhookSecret: "s", tier: "live" } });
    const res = await new WebhooksNamespace(http).create({ feedId: "events.race", webhookUrl: "https://example.com/hook" });
    expect(res.webhook.webhookId).toBe("wh_1");
    expect(calls[0].body).toEqual({ feedId: "events.race", webhookUrl: "https://example.com/hook", webhookMethod: "post", filters: {} });
  });

  it("create() sends feedIds and returns the endpoint shape", async () => {
    const { http, calls } = fakeHttp({ data: { webhookId: "wh_2", webhookUrl: "u", webhookMethod: "post", subscriptions: endpoint.subscriptions, webhookSecret: "s", tier: "live" } });
    const res = await new WebhooksNamespace(http).create({ feedIds: ["events.race", "analytics.*"], webhookUrl: "u", seriesId: "f1" });
    expect(res.webhookId).toBe("wh_2");
    expect(res.subscriptions).toHaveLength(1);
    expect(calls[0].body).toEqual({ feedIds: ["events.race", "analytics.*"], webhookUrl: "u", webhookMethod: "post", filters: {}, seriesId: "f1" });
  });

  it("create() sends subscriptions with per-feed filters", async () => {
    const { http, calls } = fakeHttp({ data: { webhookId: "wh_3", webhookUrl: "u", subscriptions: [], tier: "live" } });
    await new WebhooksNamespace(http).create({ subscriptions: [{ feedId: "events.race", filters: { drivers: ["VER"] } }], webhookUrl: "u" });
    expect(calls[0].body).toEqual({ subscriptions: [{ feedId: "events.race", filters: { drivers: ["VER"] } }], webhookUrl: "u", webhookMethod: "post", filters: {} });
  });
});

describe("FantasyNamespace.getSessionPitTimes", () => {
  it("exposes pitStopTimeSec on fastestStop and stops", async () => {
    const stop = { driver: "max_verstappen", tla: "VER", team: "Red Bull", pitStopTimeSec: 2.1, lap: 20 };
    const { http } = fakeHttp({ data: { sessionId: "s", source: "historical", fastestStop: stop, stops: [stop] } });
    const res = await new FantasyNamespace(http).getSessionPitTimes("s");
    expect(res.fastestStop?.pitStopTimeSec).toBe(2.1);
    expect(res.stops[0].pitStopTimeSec).toBe(2.1);
  });
});
