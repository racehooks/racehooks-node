/**
 * Tests for SimulateNamespace — pause, resume, cancel, start, list, get.
 */
import { SimulateNamespace } from "../simulate.js";
import type { Simulation } from "../types.js";

function makeSimulation(overrides: Partial<Simulation> = {}): Simulation {
  return {
    simulationId: "sim-001",
    clientId: "client-001",
    sessionId: "2026-bahrain-r1",
    sessionName: "Race",
    sessionPath: "2026/2026-03-16_Bahrain_Grand_Prix/2026-03-16_Race/",
    status: "running",
    speed: "1",
    feedsRequested: "TimingData,RaceControlMessages",
    eventsDispatched: 142,
    deliveryCount: 142,
    errorCount: 0,
    logEntries: null,
    startedAt: "2026-06-14T12:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── start ─────────────────────────────────────────────────────────────────────

describe("SimulateNamespace.start", () => {
  it("POSTs to /simulate and returns the simulation", async () => {
    const sim = makeSimulation();
    const { http, calls } = makeHttp({ "/simulate": { data: sim } });
    const ns = new SimulateNamespace(http);

    const result = await ns.start({ sessionId: "2026-bahrain-r1", speed: 1 });
    expect(result.simulationId).toBe("sim-001");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].path).toBe("/simulate");
  });
});

// ── list ──────────────────────────────────────────────────────────────────────

describe("SimulateNamespace.list", () => {
  it("GETs /simulate and returns the simulations array", async () => {
    const sim = makeSimulation({ status: "completed" });
    const { http, calls } = makeHttp({ "/simulate": { data: { simulations: [sim] } } });
    const ns = new SimulateNamespace(http);

    const result = await ns.list();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("completed");
    expect(calls[0].method).toBe("GET");
  });
});

// ── get ───────────────────────────────────────────────────────────────────────

describe("SimulateNamespace.get", () => {
  it("GETs /simulate/:id and returns the simulation", async () => {
    const sim = makeSimulation({ simulationId: "sim-abc" });
    const { http, calls } = makeHttp({ "/simulate/sim-abc": { data: sim } });
    const ns = new SimulateNamespace(http);

    const result = await ns.get("sim-abc");
    expect(result.simulationId).toBe("sim-abc");
    expect(calls[0].path).toBe("/simulate/sim-abc");
  });
});

// ── pause ─────────────────────────────────────────────────────────────────────

describe("SimulateNamespace.pause", () => {
  it("POSTs to /simulate/:id/pause and returns the updated simulation", async () => {
    const paused = makeSimulation();
    const { http, calls } = makeHttp({ "/simulate/sim-001/pause": { data: paused } });
    const ns = new SimulateNamespace(http);

    const result = await ns.pause("sim-001");
    expect(result.simulationId).toBe("sim-001");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].path).toBe("/simulate/sim-001/pause");
  });

  it("sends no body with the pause request", async () => {
    const { http, calls } = makeHttp({ "/simulate/sim-001/pause": { data: makeSimulation() } });
    const ns = new SimulateNamespace(http);

    await ns.pause("sim-001");
    expect(calls[0].body).toBeUndefined();
  });
});

// ── resume ────────────────────────────────────────────────────────────────────

describe("SimulateNamespace.resume", () => {
  it("POSTs to /simulate/:id/resume and returns the updated simulation", async () => {
    const resumed = makeSimulation({ status: "running" });
    const { http, calls } = makeHttp({ "/simulate/sim-001/resume": { data: resumed } });
    const ns = new SimulateNamespace(http);

    const result = await ns.resume("sim-001");
    expect(result.simulationId).toBe("sim-001");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].path).toBe("/simulate/sim-001/resume");
  });
});

// ── cancel ────────────────────────────────────────────────────────────────────

describe("SimulateNamespace.cancel", () => {
  it("DELETEs /simulate/:id", async () => {
    const { http, calls } = makeHttp();
    const ns = new SimulateNamespace(http);

    await ns.cancel("sim-001");
    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].path).toBe("/simulate/sim-001");
  });
});
