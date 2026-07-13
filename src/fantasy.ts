import type { HttpClient } from "./http.js";
import type { PitTimeStop, FantasyScoreEntry } from "./types.js";

export class FantasyNamespace {
  constructor(private readonly http: HttpClient) {}

  // Live pit lane leaderboard. Only populated during active sessions.
  async getSessionPitTimes(sessionId: string): Promise<{
    sessionId: string;
    source: "live" | "historical";
    fastestStop: PitTimeStop | null;
    stops: PitTimeStop[];
  }> {
    const res = await this.http.get<{ data: {
      sessionId: string;
      source: "live" | "historical";
      fastestStop: PitTimeStop | null;
      stops: PitTimeStop[];
    } }>(`/fantasy/session/${sessionId}/pit-times`);
    return res.data;
  }

  // Running (provisional) fantasy score for each driver while a session is live.
  // Position, teammate and DNF components update live; grid-derived and fastest-lap
  // components stay null until the session ends (use getRaceScores for the final
  // breakdown). Returns an empty `scores` list with `live: false` when no session
  // is currently live for this id.
  async getSessionScores(sessionId: string): Promise<{
    sessionId: string;
    live: boolean;
    provisional: boolean;
    sessionType: "grand_prix" | "sprint";
    currentLap: number;
    totalLaps: number;
    scores: Array<{
      driver: string;
      tla: string;
      team: string;
      breakdown: {
        racePosPoints: number;
        qualiPosPoints: number | null;
        q3Bonus: number | null;
        positionsGained: number | null;
        positionsGainedPoints: number;
        fastestLapPoints: number | null;
        beatTeammateRace: number;
        beatTeammateQuali: number | null;
        dnfPenalty: number;
        total: number;
      };
    }>;
  }> {
    const res = await this.http.get<{ data: {
      sessionId: string;
      live: boolean;
      provisional: boolean;
      sessionType: "grand_prix" | "sprint";
      currentLap: number;
      totalLaps: number;
      scores: Array<{
        driver: string;
        tla: string;
        team: string;
        breakdown: {
          racePosPoints: number;
          qualiPosPoints: number | null;
          q3Bonus: number | null;
          positionsGained: number | null;
          positionsGainedPoints: number;
          fastestLapPoints: number | null;
          beatTeammateRace: number;
          beatTeammateQuali: number | null;
          dnfPenalty: number;
          total: number;
        };
      }>;
    } }>(`/fantasy/session/${sessionId}/scores`);
    return res.data;
  }

  // Estimated fantasy points per driver for a completed session. Defaults to the
  // Grand Prix; pass { session: "sprint" } to score the Sprint (compressed points
  // table). `sessionType` on the response echoes which session was scored.
  async getRaceScores(
    raceId: string,
    opts?: { session?: "grand_prix" | "sprint" }
  ): Promise<{
    raceId: string;
    sessionType: "grand_prix" | "sprint";
    scores: FantasyScoreEntry[];
    dataQuality?: string;
  }> {
    // The API querystring accepts session=sprint (default = Grand Prix); only the
    // Sprint needs an explicit param.
    const query = opts?.session === "sprint" ? "?session=sprint" : "";
    const res = await this.http.get<{ data: {
      raceId: string;
      sessionType: "grand_prix" | "sprint";
      scores: FantasyScoreEntry[];
      dataQuality?: string;
    } }>(`/fantasy/races/${raceId}/scores${query}`);
    return res.data;
  }
}
