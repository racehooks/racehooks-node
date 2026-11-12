import type { HttpClient } from "./http.js";
import type { InsightRace, InsightBundle, ModelMeta } from "./types.js";

export class InsightsNamespace {
  constructor(private readonly http: HttpClient) {}

  async listRaces(opts: { season?: number } = {}): Promise<InsightRace[]> {
    const p = opts.season ? `?season=${opts.season}` : "";
    const res = await this.http.get<{ data: { races: InsightRace[] } }>(`/insights/races${p}`);
    return res.data.races;
  }

  async getRace(raceId: string): Promise<InsightBundle> {
    const res = await this.http.get<{ data: InsightBundle }>(`/insights/races/${raceId}`);
    return res.data;
  }

  async getModelMeta(): Promise<ModelMeta> {
    const res = await this.http.get<{ data: ModelMeta }>("/insights/model-meta");
    return res.data;
  }
}
