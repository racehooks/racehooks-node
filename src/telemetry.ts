import type { HttpClient } from "./http.js";
import type { LapTelemetryEntry, TelemetrySummary } from "./types.js";

export class TelemetryNamespace {
  constructor(private readonly http: HttpClient) {}

  // All drivers, all laps. Optional driverId or lapNumber filter.
  async getRaceLaps(
    raceId: string,
    opts: { driverId?: string; lapNumber?: number } = {},
  ): Promise<{ raceId: string; laps: LapTelemetryEntry[] }> {
    const p = new URLSearchParams();
    if (opts.driverId) p.set("driverId", opts.driverId);
    if (opts.lapNumber !== undefined) p.set("lapNumber", String(opts.lapNumber));
    const qs = p.size ? `?${p}` : "";
    const res = await this.http.get<{ data: { raceId: string; laps: LapTelemetryEntry[] } }>(
      `/telemetry/races/${raceId}/laps${qs}`,
    );
    return res.data;
  }

  // Single driver, all laps.
  async getDriverLaps(
    raceId: string,
    driverId: string,
  ): Promise<{ raceId: string; driverId: string; laps: LapTelemetryEntry[] }> {
    const res = await this.http.get<{ data: { raceId: string; driverId: string; laps: LapTelemetryEntry[] } }>(
      `/telemetry/races/${raceId}/drivers/${driverId}/laps`,
    );
    return res.data;
  }

  // All drivers for a single lap — cross-driver comparison.
  async getLapComparison(
    raceId: string,
    lapNumber: number,
  ): Promise<{ raceId: string; lapNumber: number; drivers: LapTelemetryEntry[] }> {
    const res = await this.http.get<{ data: { raceId: string; lapNumber: number; drivers: LapTelemetryEntry[] } }>(
      `/telemetry/races/${raceId}/laps/${lapNumber}`,
    );
    return res.data;
  }

  async getRaceSummary(raceId: string): Promise<{ raceId: string; summary: TelemetrySummary | null }> {
    const res = await this.http.get<{ data: { raceId: string; summary: TelemetrySummary | null } }>(
      `/telemetry/races/${raceId}/summary`,
    );
    return res.data;
  }
}
