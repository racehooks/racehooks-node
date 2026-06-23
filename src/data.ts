import type { HttpClient } from "./http.js";
import type {
  Driver,
  DriverCareerStats,
  DriverResult,
  DriverStanding,
  Constructor,
  ConstructorStanding,
  Circuit,
  CircuitAnalytics,
  Season,
  Race,
  RaceResult,
  QualifyingResult,
  PitStop,
  TyreStint,
  LapTime,
  WeatherEntry,
  PaginatedResult,
} from "./types.js";

function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) p.set(k, String(v));
  }
  return p.size ? `?${p}` : "";
}

export class DataNamespace {
  constructor(private readonly http: HttpClient) {}

  // ── Drivers ──────────────────────────────────────────────────────────────

  async listDrivers(opts: {
    limit?: number;
    offset?: number;
    search?: string;
    nationality?: string;
    active?: boolean;
  } = {}): Promise<PaginatedResult<Driver>> {
    const res = await this.http.get<{ data: { drivers: Driver[]; total: number; limit: number; offset: number } }>(
      `/data/drivers${qs(opts)}`,
    );
    return { data: res.data.drivers, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  }

  async getDriver(driverId: string): Promise<{ driver: Driver; careerStats: DriverCareerStats | null }> {
    const res = await this.http.get<{ data: { driver: Driver; careerStats: DriverCareerStats | null } }>(
      `/data/drivers/${driverId}`,
    );
    return res.data;
  }

  async getDriverResults(
    driverId: string,
    opts: { season?: number; limit?: number; offset?: number } = {},
  ): Promise<PaginatedResult<DriverResult>> {
    const res = await this.http.get<{ data: { driverId: string; results: DriverResult[]; total: number; limit: number; offset: number } }>(
      `/data/drivers/${driverId}/results${qs(opts)}`,
    );
    return { data: res.data.results, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  }

  async getDriverStandings(
    driverId: string,
    opts: { season?: number } = {},
  ): Promise<DriverStanding[]> {
    const res = await this.http.get<{ data: { driverId: string; standings: DriverStanding[] } }>(
      `/data/drivers/${driverId}/standings${qs(opts)}`,
    );
    return res.data.standings;
  }

  // ── Constructors ──────────────────────────────────────────────────────────

  async listConstructors(opts: {
    limit?: number;
    offset?: number;
    lineage?: string;
    active?: boolean;
  } = {}): Promise<PaginatedResult<Constructor>> {
    const res = await this.http.get<{ data: { constructors: Constructor[]; total: number; limit: number; offset: number } }>(
      `/data/constructors${qs(opts)}`,
    );
    return { data: res.data.constructors, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  }

  async getConstructor(constructorId: string): Promise<{
    constructor: Constructor | null;
    lineageHistory: Array<{ constructorId: string; name: string; activeFromYear: number | null; activeToYear: number | null }>;
  }> {
    const res = await this.http.get<{ data: {
      constructor: Constructor | null;
      lineageHistory: Array<{ constructorId: string; name: string; activeFromYear: number | null; activeToYear: number | null }>;
    } }>(`/data/constructors/${constructorId}`);
    return res.data;
  }

  async getConstructorResults(
    constructorId: string,
    opts: { season?: number; limit?: number; offset?: number } = {},
  ): Promise<PaginatedResult<DriverResult & { driverId: string }>> {
    const res = await this.http.get<{ data: { constructorId: string; results: Array<DriverResult & { driverId: string }>; total: number; limit: number; offset: number } }>(
      `/data/constructors/${constructorId}/results${qs(opts)}`,
    );
    return { data: res.data.results, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  }

  async getConstructorStandings(
    constructorId: string,
    opts: { season?: number } = {},
  ): Promise<ConstructorStanding[]> {
    const res = await this.http.get<{ data: { constructorId: string; standings: ConstructorStanding[] } }>(
      `/data/constructors/${constructorId}/standings${qs(opts)}`,
    );
    return res.data.standings;
  }

  // ── Circuits ──────────────────────────────────────────────────────────────

  async listCircuits(opts: { limit?: number; offset?: number; country?: string } = {}): Promise<PaginatedResult<Circuit>> {
    const res = await this.http.get<{ data: { circuits: Circuit[]; total: number; limit: number; offset: number } }>(
      `/data/circuits${qs(opts)}`,
    );
    return { data: res.data.circuits, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  }

  async getCircuit(circuitId: string): Promise<{ circuit: Circuit; analytics: CircuitAnalytics | null }> {
    const res = await this.http.get<{ data: { circuit: Circuit; analytics: CircuitAnalytics | null } }>(
      `/data/circuits/${circuitId}`,
    );
    return res.data;
  }

  // ── Seasons ───────────────────────────────────────────────────────────────

  async listSeasons(): Promise<Season[]> {
    const res = await this.http.get<{ data: { seasons: Season[] } }>("/data/seasons");
    return res.data.seasons;
  }

  async getSeasonStandings(year: number): Promise<{
    year: number;
    driverStandings: DriverStanding[];
    constructorStandings: ConstructorStanding[];
  }> {
    const res = await this.http.get<{ data: {
      year: number;
      driverStandings: DriverStanding[];
      constructorStandings: ConstructorStanding[];
    } }>(`/data/seasons/${year}/standings`);
    return res.data;
  }

  async getSeasonRaces(year: number): Promise<{ year: number; races: Race[] }> {
    const res = await this.http.get<{ data: { year: number; races: Race[] } }>(
      `/data/seasons/${year}/races`,
    );
    return res.data;
  }

  // ── Races ─────────────────────────────────────────────────────────────────

  async getRace(raceId: string): Promise<{
    race: Race;
    results: RaceResult[];
    qualifying: QualifyingResult[];
  }> {
    const res = await this.http.get<{ data: { race: Race; results: RaceResult[]; qualifying: QualifyingResult[] } }>(
      `/data/races/${raceId}`,
    );
    return res.data;
  }

  async getRaceQualifying(raceId: string): Promise<QualifyingResult[]> {
    const res = await this.http.get<{ data: { qualifying: QualifyingResult[] } }>(
      `/data/races/${raceId}/qualifying`,
    );
    return res.data.qualifying;
  }

  async getRacePitstops(raceId: string): Promise<PitStop[]> {
    const res = await this.http.get<{ data: { pitstops: PitStop[] } }>(
      `/data/races/${raceId}/pitstops`,
    );
    return res.data.pitstops;
  }

  async getRaceTyres(raceId: string): Promise<TyreStint[]> {
    const res = await this.http.get<{ data: { tyres: TyreStint[] } }>(
      `/data/races/${raceId}/tyres`,
    );
    return res.data.tyres;
  }

  async getRaceWeather(raceId: string): Promise<WeatherEntry[]> {
    const res = await this.http.get<{ data: { weather: WeatherEntry[] } }>(
      `/data/races/${raceId}/weather`,
    );
    return res.data.weather;
  }

  // Requires Bearer auth (live+ tier). Routes to /laps/:driverId when driverId is provided.
  async getRaceLaps(raceId: string, opts: { driverId?: string } = {}): Promise<LapTime[]> {
    const path = opts.driverId
      ? `/data/races/${raceId}/laps/${opts.driverId}`
      : `/data/races/${raceId}/laps`;
    const res = await this.http.get<{ data: { laps: LapTime[] } }>(path);
    return res.data.laps;
  }

  async getRaceSummary(raceId: string): Promise<Record<string, unknown>> {
    const res = await this.http.get<{ data: Record<string, unknown> }>(`/data/races/${raceId}/summary`);
    return res.data;
  }

  // Requires Bearer auth (live+ tier).
  async getRaceTelemetryLaps(raceId: string, opts: { driverId?: string } = {}): Promise<Record<string, unknown>> {
    const res = await this.http.get<{ data: Record<string, unknown> }>(
      `/data/races/${raceId}/telemetry/laps${qs(opts)}`,
    );
    return res.data;
  }

  // Requires Bearer auth (analytics+ tier).
  async getRaceTelemetryStints(raceId: string, opts: { driverId?: string } = {}): Promise<Record<string, unknown>> {
    const res = await this.http.get<{ data: Record<string, unknown> }>(
      `/data/races/${raceId}/telemetry/stints${qs(opts)}`,
    );
    return res.data;
  }

  // Requires Bearer auth (analytics+ tier).
  async getRaceTelemetryAggression(raceId: string): Promise<Record<string, unknown>> {
    const res = await this.http.get<{ data: Record<string, unknown> }>(
      `/data/races/${raceId}/telemetry/aggression`,
    );
    return res.data;
  }

  // Requires Bearer auth (live+ tier).
  async getSessionAnalytics(sessionId: string): Promise<Record<string, unknown>> {
    const res = await this.http.get<{ data: Record<string, unknown> }>(
      `/data/sessions/${sessionId}/analytics`,
    );
    return res.data;
  }

  // Requires Bearer auth (live+ tier).
  async getEventPace(eventId: string): Promise<Record<string, unknown>> {
    const res = await this.http.get<{ data: Record<string, unknown> }>(
      `/data/events/${eventId}/pace`,
    );
    return res.data;
  }
}
