import type { HttpClient } from "./http.js";
import type { SimulateArtifact, ReplayQuota, ReplayableSession } from "./types.js";

/**
 * Session replay ("simulate"): prepare a completed session's recorded-playback artifact and stream
 * it from the simulate-stream service as if it were live.
 *
 * NOTE: the old per-request replay engine (`start`/`get`/`list`/`pause`/`resume`/`cancel` →
 * `POST /v1/simulate`, `/v1/simulate/:id`) was retired server-side and now 404s. This namespace
 * targets the current artifact surface. Any authenticated tier (incl. `live`) can list and prepare
 * real non-demo sessions; tier controls the artifact profile (`lite` vs `full`) and the quota.
 */
export class SimulateNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * List completed sessions available for replay. Free tier sees the current season plus the curated
   * demo session; paid tiers see the full archive. Session ids are archive ids like
   * `2026-great-britain_r` (`_q` qualifying, `_s` sprint, `_p1` practice).
   */
  async sessions(
    opts: { year?: number; type?: "race" | "qualifying" | "sprint" | "practice"; limit?: number; offset?: number } = {},
  ): Promise<{
    sessions: ReplayableSession[];
    total: number;
    limit: number;
    offset: number;
    /** The season the listing is clamped to when the tier limits the archive, else null. */
    restrictedToSeason: string | null;
  }> {
    const qs = new URLSearchParams();
    if (opts.year !== undefined) qs.set("year", String(opts.year));
    if (opts.type) qs.set("type", opts.type);
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
    const res = await this.http.get<{
      data: { sessions: ReplayableSession[]; total: number; limit: number; offset: number; restrictedToSeason: string | null };
    }>(`/simulate/sessions${qs.size ? `?${qs}` : ""}`);
    return res.data;
  }

  /** Whether a session's recorded-playback artifact is ready to stream. */
  async status(sessionId: string): Promise<SimulateArtifact> {
    const res = await this.http.get<{ data: SimulateArtifact }>(
      `/simulate/status?session=${encodeURIComponent(sessionId)}`,
    );
    return res.data;
  }

  /** Ensure a session's artifact exists, triggering (deduped) generation if it is cold. */
  async prepare(sessionId: string): Promise<SimulateArtifact> {
    const res = await this.http.post<{ data: SimulateArtifact }>("/simulate/prepare", { sessionId });
    return res.data;
  }

  /** The curated demo session (a guaranteed-warm real event), resolved server-side. */
  async demo(): Promise<{ sessionId: string; sessionName?: string; status: "ready" | "missing" }> {
    const res = await this.http.get<{
      data: { sessionId: string; sessionName?: string; status: "ready" | "missing" };
    }>("/simulate/demo");
    return res.data;
  }

  /** Distinct-session replay-delivery quota for the authenticated client's tier (`limit: -1` = unlimited). */
  async quota(): Promise<ReplayQuota> {
    const res = await this.http.get<{ data: ReplayQuota }>("/simulate/quota");
    return res.data;
  }
}
