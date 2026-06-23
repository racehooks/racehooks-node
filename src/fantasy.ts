import type { HttpClient } from "./http.js";
import type { PitTimeStop, FantasyScoreEntry } from "./types.js";

export class FantasyNamespace {
  constructor(private readonly http: HttpClient) {}

  // Live pit lane leaderboard. Only populated during active sessions.
  async getSessionPitTimes(sessionId: string): Promise<{
    sessionId: string;
    source: "live" | "historical";
    fastestStop: { driver: string; pitLaneTimeSec: number; lap: number } | null;
    stops: PitTimeStop[];
  }> {
    const res = await this.http.get<{ data: {
      sessionId: string;
      source: "live" | "historical";
      fastestStop: { driver: string; pitLaneTimeSec: number; lap: number } | null;
      stops: PitTimeStop[];
    } }>(`/fantasy/session/${sessionId}/pit-times`);
    return res.data;
  }

  async getRaceScores(raceId: string): Promise<{
    raceId: string;
    scores: FantasyScoreEntry[];
    dataQuality?: string;
  }> {
    const res = await this.http.get<{ data: {
      raceId: string;
      scores: FantasyScoreEntry[];
      dataQuality?: string;
    } }>(`/fantasy/races/${raceId}/scores`);
    return res.data;
  }
}
