import type { HttpClient } from "./http.js";
import type { Simulation } from "./types.js";

export interface StartSimulationOptions {
  sessionId: string;
  speed?: number | "instant" | "unlimited";
  feeds?: string[];
  mode?: "client" | "pipeline";
}

export class SimulateNamespace {
  constructor(private readonly http: HttpClient) {}

  async start(opts: StartSimulationOptions): Promise<Simulation> {
    const res = await this.http.post<{ data: Simulation }>("/simulate", opts);
    return res.data;
  }

  async list(opts: { limit?: number; offset?: number } = {}): Promise<Simulation[]> {
    const qs = new URLSearchParams();
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
    const res = await this.http.get<{ data: { simulations: Simulation[] } }>(
      `/simulate${qs.size ? `?${qs}` : ""}`,
    );
    return res.data.simulations;
  }

  async get(simulationId: string): Promise<Simulation> {
    const res = await this.http.get<{ data: Simulation }>(`/simulate/${simulationId}`);
    return res.data;
  }

  async pause(simulationId: string): Promise<Simulation> {
    const res = await this.http.post<{ data: Simulation }>(`/simulate/${simulationId}/pause`);
    return res.data;
  }

  async resume(simulationId: string): Promise<Simulation> {
    const res = await this.http.post<{ data: Simulation }>(`/simulate/${simulationId}/resume`);
    return res.data;
  }

  async cancel(simulationId: string): Promise<void> {
    await this.http.delete(`/simulate/${simulationId}`);
  }
}
