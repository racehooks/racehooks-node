import type { HttpClient } from "./http.js";
import type { Simulation } from "./types.js";

export interface StartSimulationOptions {
  sessionId: string;
  speed?: number | "instant";
  feeds?: string[];
}

export class SimulateNamespace {
  constructor(private readonly http: HttpClient) {}

  async start(opts: StartSimulationOptions): Promise<Simulation> {
    const res = await this.http.post<{ data: Simulation }>("/simulate", opts);
    return res.data;
  }

  async list(): Promise<Simulation[]> {
    const res = await this.http.get<{ data: { simulations: Simulation[] } }>("/simulate");
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
