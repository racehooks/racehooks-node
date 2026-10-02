/**
 * Tests for SimulateNamespace — sessions, status, prepare, demo, quota (the artifact surface that
 * replaced the retired POST /v1/simulate engine).
 */
import { SimulateNamespace } from "../simulate.js";
import type { SimulateArtifact, ReplayableSession } from "../types.js";

function makeArtifact(overrides: Partial<SimulateArtifact> = {}): SimulateArtifact {
  return {
    sessionId: "2026-great-britain_r",
    sessionName: "Race",
    modelVersion: "unversioned",
    profile: "lite",
    status: "ready",
    formatFallback: false,
    ...overrides,
  };
}

type CallRecord = { method: string; path: string; body?: unknown };

function makeHttp(
  responses: Record<string, unknown> = {},
): { http: import("../http.js").HttpClient; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  const http = {
    get: async (path: string) => {
      calls.push({ method: "GET", path });
      return responses[path] ?? {};
    },
    post: async (path: string, body?: unknown) => {
      calls.push({ method: "POST", path, body });
      return responses[path] ?? {};
    },
    patch: async (path: string, body?: unknown) => {
      calls.push({ method: "PATCH", path, body });
      return responses[path] ?? {};
    },
    delete: async (path: string) => {
      calls.push({ method: "DELETE", path });
      return undefined;
    },
    request: async () => ({}),
  } as unknown as import("../http.js").HttpClient;
  return { http, calls };
}

describe("SimulateNamespace.sessions", () => {
  it("GETs /simulate/sessions and returns the listing", async () => {
    const session: ReplayableSession = {
      sessionId: "2026-great-britain_r",
      eventId: "2026-great-britain",
      eventName: "2026 British Grand Prix",
      sessionName: "Race",
    };
    const { http, calls } = makeHttp({
      "/simulate/sessions": { data: { sessions: [session], total: 1, limit: 20, offset: 0 } },
    });
    const ns = new SimulateNamespace(http);

    const result = await ns.sessions();
    expect(calls[0]).toEqual({ method: "GET", path: "/simulate/sessions" });
    expect(result.sessions[0].sessionId).toBe("2026-great-britain_r");
    expect(result.total).toBe(1);
  });

  it("passes year/type filters as query params", async () => {
    const { http, calls } = makeHttp();
    const ns = new SimulateNamespace(http);
    await ns.sessions({ year: 2026, type: "race" });
    expect(calls[0].path).toBe("/simulate/sessions?year=2026&type=race");
  });
});

describe("SimulateNamespace.status", () => {
  it("GETs /simulate/status with the session query param", async () => {
    const { http, calls } = makeHttp({
      "/simulate/status?session=2026-great-britain_r": { data: makeArtifact() },
    });
    const ns = new SimulateNamespace(http);
    const result = await ns.status("2026-great-britain_r");
    expect(calls[0].path).toBe("/simulate/status?session=2026-great-britain_r");
    expect(result.status).toBe("ready");
  });
});

describe("SimulateNamespace.prepare", () => {
  it("POSTs the sessionId to /simulate/prepare", async () => {
    const { http, calls } = makeHttp({ "/simulate/prepare": { data: makeArtifact({ status: "preparing" }) } });
    const ns = new SimulateNamespace(http);
    const result = await ns.prepare("2026-great-britain_r");
    expect(calls[0]).toEqual({
      method: "POST",
      path: "/simulate/prepare",
      body: { sessionId: "2026-great-britain_r" },
    });
    expect(result.status).toBe("preparing");
  });
});

describe("SimulateNamespace.demo / quota", () => {
  it("GETs /simulate/demo", async () => {
    const { http, calls } = makeHttp({
      "/simulate/demo": { data: { sessionId: "2026-canada_r", status: "ready" } },
    });
    const ns = new SimulateNamespace(http);
    const result = await ns.demo();
    expect(calls[0].path).toBe("/simulate/demo");
    expect(result.sessionId).toBe("2026-canada_r");
  });

  it("GETs /simulate/quota", async () => {
    const { http, calls } = makeHttp({
      "/simulate/quota": { data: { limit: -1, used: 0, remaining: -1, unlocked: [], currentSeasonOnly: false } },
    });
    const ns = new SimulateNamespace(http);
    const result = await ns.quota();
    expect(calls[0].path).toBe("/simulate/quota");
    expect(result.limit).toBe(-1);
  });
});
