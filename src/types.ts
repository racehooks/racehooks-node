// ---------------------------------------------------------------------------
// Shared types mirroring the RaceHooks API response shapes
// ---------------------------------------------------------------------------

export type SubscriptionTier = "free" | "live" | "analytics" | "enterprise";

export interface WebhookFilters {
  drivers?: string[];
  driverNumbers?: string[];
  constructors?: string[];
  positions?: { min?: number; max?: number };
  eventTypes?: string[];
}

export interface Webhook {
  webhookId: string;
  feedId: string;
  webhookUrl: string;
  webhookMethod: "post" | "put";
  active: boolean;
  subscriptionTier: SubscriptionTier;
  filters: WebhookFilters;
  createdAt: string;
  updatedAt: string;
}

export interface Feed {
  feedId: string;
  name: string;
  path: string;
  availability: SubscriptionTier;
}

export interface DeliveryLog {
  logId: string;
  webhookId: string;
  statusCode: number;
  retryCount: number;
  errorMessage: string | null;
  payload: string;
  createdAt: string;
}

export interface Simulation {
  simulationId: string;
  clientId: string;
  sessionId: string;
  sessionName: string;
  sessionPath: string;
  status: "running" | "completed" | "failed" | "cancelled";
  speed: string;
  feedsRequested: string;
  eventsDispatched: number;
  deliveryCount: number;
  errorCount: number;
  logEntries: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface SubscriptionData {
  tier: SubscriptionTier;
  active: boolean;
  limits: {
    maxWebhooks: number;
    dailyDeliveryLimit: number | "unlimited";
    hmacEnabled: boolean;
  };
  usage: {
    period: string;
    webhookCount: number;
    webhooksRemaining: number | null;
    dailyDeliveries: number;
    dailyRemaining: number | null;
    failureCount: number;
  };
  upgrade?: {
    message: string;
    availableTiers: string[];
  } | null;
}

export interface UsageByFeedEntry {
  feedId: string;
  deliveryCount: number;
  failureCount: number;
}

export interface Event {
  eventId: string;
  name: string;
  officialName: string;
  countryCode: string;
  countryName: string;
  location: string;
  circuitName: string;
  state: string;
  type: string;
  roundText: string;
  sessions?: EventSession[];
}

export interface EventSession {
  sessionId: string;
  type: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  gmtOffset: string;
  path: string;
}

export interface LiveDriverRow {
  pos: number;
  num: string;
  tla: string;
  name: string;
  team: string;
  gap: string;
  interval: string;
  lastLap: string;
  s1: string;
  s2: string;
  s3: string;
  compound: string;
  tyreAge: number;
  pits: number;
  status: "OnTrack" | "InPit" | "Retired" | "Unknown";
}

export interface LiveContext {
  active: boolean;
  sessionName: string;
  sessionType: string;
  currentLap: number;
  totalLaps: number;
  flag: "green" | "yellow" | "sc" | "vsc" | "red" | "checkered";
  drivers: LiveDriverRow[];
  rcMessages: { utc: string; lap: number; category: string; message: string; flag: string }[];
  updatedAt: number;
}

/** Stable driver identity block included in every normalized payload driver entry. */
export interface DriverRef {
  driverId: string;
  constructorId: string;
  number: string;
  tla: string;
  name: string;
  team: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Analytics feed sub-types — shared by the analytics.* feeds
// (analytics.strategy, analytics.race-odds, analytics.gap-projection, etc.)
// ---------------------------------------------------------------------------

export type CliffRisk = "NONE" | "GRAINING" | "THERMAL" | "BLISTERING_RISK" | "BLISTERING";
export type DegMode = "WARM_UP" | "STABLE" | "DEGRADING" | "CLIFF";
export type HealthLabel = "GOOD" | "MODERATE" | "LOW" | "CRITICAL";
export type PaceMode = "PUSH" | "CONSERVE" | "HOTLAP" | "OUTLAP" | "INLAP" | "UNKNOWN";

/** Tyre-degradation snapshot — delivered per driver in `analytics.strategy`. */
export interface TireHealthSnapshot {
  tireHealth: number;
  tireHealthPct: number;
  degRateSecPerLap: number;
  cliffLapPredicted: number | null;
  remainingUsefulLife: number;
  cliffRisk: CliffRisk;
  cumulativeDegSec: number;
  stintLaps: number;
  confidenceLow: number;
  confidenceHigh: number;
  degModeActive: DegMode;
  healthLabel: HealthLabel;
}

/** Lap-Time Over Expectation snapshot — delivered per driver in `analytics.strategy`. */
export interface LTOESnapshot {
  /** Actual − expected fuel-corrected lap time (negative = driver faster than context). */
  ltoeSec: number;
  expectedLapTimeSec: number;
  actualLapTimeSec: number;
  /** 0.0–1.0; lower = reduced certainty (e.g. early-season calibration). */
  confidenceScale: number;
}

/** Undercut threat assessment — delivered per driver in `analytics.strategy`. */
export interface UndercutThreatSnapshot {
  /** Composite undercut threat score (0–1). */
  score: number;
  viable: boolean;
  gapToCarAheadSec: number;
  /** Negative = time gain for the undercut car. */
  estimatedDeltaSec: number;
}

// ---------------------------------------------------------------------------
// analytics.strategy — per-lap strategy signals (race/sprint only)
// ---------------------------------------------------------------------------

export interface AnalyticsStrategyDriver extends DriverRef {
  pitStopProbability?: number;
  pitRecommended?: boolean;
  overtakeProbability?: number;
  undercutThreat?: UndercutThreatSnapshot;
  paceMode?: PaceMode;
  ltoe?: LTOESnapshot;
  ltoeConfidenceFlag?: "2026_early" | "stable";
  tireHealth?: TireHealthSnapshot;
  dnfRisk?: number;
}

export interface AnalyticsStrategyPayload {
  feed: "analytics.strategy";
  sessionId: string | null;
  raceId: string | null;
  lap: number;
  utc: string;
  regulationsEra: string;
  safetyCarProbability?: number;
  competitorIntelligence?: Record<string, unknown>;
  drivers: AnalyticsStrategyDriver[];
}

// ---------------------------------------------------------------------------
// analytics.race-odds — per-lap CTMC outcome probabilities (race/sprint only)
// ---------------------------------------------------------------------------

export interface AnalyticsRaceOddsDriver extends DriverRef {
  /** P(finish at each position), 1-indexed (index 0 unused). */
  positionDistribution?: number[];
  mostLikelyPosition?: number;
  /** Expected championship points from this race. */
  expectedPoints?: number;
  /** P(finish in top 10). */
  pointsFinishProbability?: number;
  podiumProbability?: number;
  top6Probability?: number;
  top10Probability?: number;
  lapsLedExpected?: number;
  positionChange?: number;
  /** P(driver beats teammate), 0.0–1.0. */
  h2hVsTeammate?: number;
  fastestLapProbability?: number;
}

/** Head-to-head win probability for a same-constructor pair. */
export interface ConstructorH2HPair {
  constructorId: string;
  driverA: string;
  driverB: string;
  /** P(driverA finishes ahead of driverB). */
  h2hAWinsProbability: number;
}

export interface AnalyticsRaceOddsPayload {
  feed: "analytics.race-odds";
  sessionId: string | null;
  raceId: string | null;
  lap: number;
  utc: string;
  regulationsEra: string;
  drivers: AnalyticsRaceOddsDriver[];
  /** Same-team H2H pairs (max 10). Delivered in full regardless of driver filters. */
  pairs?: ConstructorH2HPair[];
}

// ---------------------------------------------------------------------------
// analytics.gap-projection — Monte Carlo projected gap to leader (race/sprint)
// ---------------------------------------------------------------------------

export interface AnalyticsGapProjectionDriver extends DriverRef {
  /** Median projected gap to race leader at flag (seconds). */
  projectedGapSec?: number;
  p10GapSec?: number;
  p25GapSec?: number;
  p50GapSec?: number;
  p75GapSec?: number;
  p90GapSec?: number;
  /** P(driver gets lapped before the end). */
  lappedProbability?: number;
}

export interface AnalyticsGapProjectionPayload {
  feed: "analytics.gap-projection";
  sessionId: string | null;
  raceId: string | null;
  lap: number;
  utc: string;
  regulationsEra: string;
  drivers: AnalyticsGapProjectionDriver[];
}

// ---------------------------------------------------------------------------
// analytics.tire-strategy — next-compound probabilities (sparse, per pit approach)
// ---------------------------------------------------------------------------

export interface AnalyticsTireStrategyDriver extends DriverRef {
  pitStopProbability: number;
  /** Keyed by compound name (e.g. "SOFT", "MEDIUM", "HARD"). */
  nextCompoundProbabilities: Record<string, number>;
}

/** Fires only for drivers whose `pitStopProbability` exceeds the approach threshold. */
export interface AnalyticsTireStrategyPayload {
  feed: "analytics.tire-strategy";
  sessionId: string | null;
  raceId: string | null;
  lap: number;
  utc: string;
  regulationsEra: string;
  drivers: AnalyticsTireStrategyDriver[];
}

// ---------------------------------------------------------------------------
// analytics.constructor — constructor-level expected points (race/sprint)
// ---------------------------------------------------------------------------

export interface AnalyticsConstructorRow {
  constructorId: string;
  expectedConstructorPoints: number;
  /** P(both drivers score points this race). */
  scoringBothDriversProbability: number;
  /** Distribution over possible total constructor points this race. */
  pointsDistribution: Record<string, number>;
}

export interface AnalyticsConstructorPayload {
  feed: "analytics.constructor";
  sessionId: string | null;
  raceId: string | null;
  lap: number;
  utc: string;
  regulationsEra: string;
  constructors: AnalyticsConstructorRow[];
}

// ---------------------------------------------------------------------------
// analytics.championship-probability — post-race WDC win probability
// ---------------------------------------------------------------------------

export interface AnalyticsChampionshipDriver extends DriverRef {
  championshipWinProbability: number;
  expectedChampionshipPoints?: number;
}

export interface AnalyticsChampionshipProbabilityPayload {
  feed: "analytics.championship-probability";
  sessionId: string | null;
  raceId: string | null;
  /** The race whose result triggered this computation. */
  afterRaceId: string;
  utc: string;
  drivers: AnalyticsChampionshipDriver[];
}

// ---------------------------------------------------------------------------
// analytics.qualifying — per-lap-improvement qualifying intelligence
// ---------------------------------------------------------------------------

export interface AnalyticsQualifyingSectors {
  /** Keyed by driver number — P(driver sets sector fastest). */
  s1FastestProbability?: Record<string, number>;
  s2FastestProbability?: Record<string, number>;
  s3FastestProbability?: Record<string, number>;
  poleProbability?: Record<string, number>;
  /** Expected gap from pole in milliseconds. */
  poleMarginMs?: number;
}

export interface AnalyticsQualifyingDriver {
  driverNumber: string;
  driverId: string;
  sector1DeltaMs: number | null;
  sector2DeltaMs: number | null;
  sector3DeltaMs: number | null;
}

export interface AnalyticsQualifyingPayload {
  feed: "analytics.qualifying";
  sessionId: string | null;
  raceId: string | null;
  lap: number;
  utc: string;
  sectors: AnalyticsQualifyingSectors;
  drivers: AnalyticsQualifyingDriver[];
}

// ---------------------------------------------------------------------------
// analytics.sector-pace — per-driver sector anomaly detection (race/sprint)
// ---------------------------------------------------------------------------

export type SectorAnomalyCause = "RAIN" | "TIRE_CLIFF" | "INCIDENT" | "UNKNOWN";
export type SectorAnomalyLevel = "WARNING" | "CRITICAL";

export interface SectorPaceReading {
  /** Current sector time minus the rolling clean-lap median (seconds). */
  deltaSec: number;
  baselineMs: number;
  cleanLapCount: number;
  currentMs: number;
}

export interface SectorPaceSnapshot {
  driverNumber: string;
  raceLap: number;
  s1: SectorPaceReading | null;
  s2: SectorPaceReading | null;
  s3: SectorPaceReading | null;
  anomalyDetected: boolean;
  anomalySector: 1 | 2 | 3 | null;
  anomalyLevel: SectorAnomalyLevel | null;
  classifiedCause: SectorAnomalyCause | null;
  /** 0–1 confidence the anomaly is rain-driven. */
  rainConfidence: number;
  /** True when ≥3 drivers show the same-sector anomaly on the same lap. */
  crossDriverCorrelated: boolean;
  driversAffectedSameSector: string[];
}

export interface AnalyticsSectorPacePayload {
  feed: "analytics.sector-pace";
  sessionId: string | null;
  lap: number;
  utc: string;
  data: SectorPaceSnapshot;
}

// ---------------------------------------------------------------------------
// analytics.battle — head-to-head battle tracking (race/sprint)
// ---------------------------------------------------------------------------

export type BattleStatus = "APPROACHING" | "STRIKING_RANGE" | "EQUAL_PACE" | "PULLING_AWAY";

export interface BattleState {
  attackerNumber: string;
  defenderNumber: string;
  currentGapSec: number;
  catchRateSecPerLap: number;
  lapsToStrikingDistance: number | null;
  battleStatus: BattleStatus;
}

export interface AnalyticsBattlePayload {
  feed: "analytics.battle";
  sessionId: string | null;
  lap: number;
  utc: string;
  data: BattleState;
}

// ---------------------------------------------------------------------------
// analytics.pit-window — per-driver optimal pit window (race/sprint)
// ---------------------------------------------------------------------------

export type PitWindowStatus = "OPEN" | "URGENT" | "CLOSING" | "CLOSED";

export interface PitWindowAlert {
  driverNumber: string;
  raceLap: number;
  status: PitWindowStatus;
  pitProbability: number;
  undercutViable: boolean;
  cliffRisk: CliffRisk;
  /** "VSC_WINDOW" | "SC_WINDOW" | "LEADER_PITTED" — null when no override applies. */
  overrideReason: string | null;
  /** Estimated time saved by pitting under VSC/SC (seconds); null when not applicable. */
  vscNetDeltaSec: number | null;
}

export interface AnalyticsPitWindowPayload {
  feed: "analytics.pit-window";
  sessionId: string | null;
  lap: number;
  utc: string;
  data: PitWindowAlert & {
    /** Expected number of remaining stops for this driver. */
    pitCount: number;
  };
}

// ---------------------------------------------------------------------------
// analytics.track-conditions — per-sector wet/dry state (race/sprint)
// ---------------------------------------------------------------------------

export type SectorCondition = "DRY" | "WET" | "DRYING" | "UNKNOWN";

export interface SectorConditions {
  sector1: SectorCondition;
  sector2: SectorCondition;
  sector3: SectorCondition;
  fullCircuitWet: boolean;
  /** Any sector WET and slick cars losing > 2 s. */
  intermediateWindowOpen: boolean;
  /** Slick cars now faster than inters in ≥ 1 sector. */
  crossoverRecommended: boolean;
  lastUpdatedLap: number;
}

export interface AnalyticsTrackConditionsPayload {
  feed: "analytics.track-conditions";
  sessionId: string | null;
  lap: number;
  utc: string;
  data: SectorConditions;
}

// ---------------------------------------------------------------------------
// analytics.pit-quality — per-stop pit crew performance (race/sprint)
// ---------------------------------------------------------------------------

export type PitQuality = "EXCEPTIONAL" | "NORMAL" | "SLOW" | "CRITICAL";

export interface PitQualityAlert {
  driverNumber: string;
  teamName: string;
  raceLap: number;
  stationaryTimeSec: number;
  /** Rolling average of this team's stops this session (before the current stop). */
  teamSessionAverageSec: number;
  /** This stop minus the team average (positive = slower). */
  vsTeamSessionAverageSec: number;
  quality: PitQuality;
  /** Nth stop this session for this driver. */
  stopNumber: number;
}

export interface AnalyticsPitQualityPayload {
  feed: "analytics.pit-quality";
  sessionId: string | null;
  lap: number;
  utc: string;
  data: PitQualityAlert;
}

// ---------------------------------------------------------------------------
// weather.rain_onset / weather.rain_cleared — rain state-machine events
// ---------------------------------------------------------------------------

export type WeatherEventType = "rain_onset" | "rain_cleared";

export interface WeatherEvent {
  type: WeatherEventType;
  lap: number;
  /** External-radar precipitation rate (mm/hr); null when unavailable. */
  precipRateMmhr: number | null;
  /** Only populated on rain_cleared. */
  rainStartLap: number | null;
  /** Only populated on rain_cleared. */
  durationLaps: number | null;
  trackTempC: number | null;
  airTempC: number | null;
  humidity: number | null;
}

export interface WeatherRainEventPayload {
  feed: "weather.rain_onset" | "weather.rain_cleared";
  sessionId: string | null;
  event: WeatherEventType;
  lap: number;
  utc: string;
  data: WeatherEvent;
}

// ---------------------------------------------------------------------------
// weather.forecast_update — predictive rain forecast (race/sprint)
// ---------------------------------------------------------------------------

export interface WeatherForecastSlot {
  timeUtc: string;
  precipRateMmhr: number;
  precipProbabilityPct: number;
}

export interface WeatherForecastUpdatePayload {
  feed: "weather.forecast_update";
  sessionId: string | null;
  event: "weather.forecast_update";
  lap: number;
  utc: string;
  source: "open-meteo";
  model: string;
  currentPrecipRateMmhr: number;
  precipProbabilityPct: number;
  /** Up to 4 × 15-min slots (60 min ahead). */
  next60min: WeatherForecastSlot[];
}

// ---------------------------------------------------------------------------
// weather.tyre_mismatch — per-driver wet-tyre alert (race/sprint)
// ---------------------------------------------------------------------------

export type TyreMismatchSeverity = "urgent" | "advisory";
export type TyreMismatchTrigger = "raining_now" | "forecast_imminent" | "forecast_watch";

export interface WeatherTyreMismatchPayload {
  feed: "weather.tyre_mismatch";
  event: "weather.tyre_mismatch";
  sessionId: string | null;
  lap: number;
  utc: string;
  driver: DriverRef;
  currentCompound: string;
  severity: TyreMismatchSeverity;
  trigger: TyreMismatchTrigger;
  expectedWetOnsetLap: number | null;
  rainProbabilityNext5Laps: number;
  intermediateWindowOpen: boolean;
}

// ---------------------------------------------------------------------------
// weather.strategy_divergence — wet vs dry compound split (race/sprint)
// ---------------------------------------------------------------------------

export interface WeatherCompoundGroup {
  count: number;
  driver_numbers: string[];
  avg_lap_delta_vs_baseline_sec: number;
}

export interface WeatherStrategyDivergencePayload {
  feed: "weather.strategy_divergence";
  sessionId: string | null;
  event: "weather.strategy_divergence";
  lap: number;
  utc: string;
  data: {
    on_wet_compounds: WeatherCompoundGroup;
    on_dry_compounds: WeatherCompoundGroup;
    favored_group: "wet_compounds" | "dry_compounds" | "neutral";
  };
}

// ---------------------------------------------------------------------------
// weather.compound_crossover_alert — inter→slick crossover after rain (race/sprint)
// ---------------------------------------------------------------------------

export interface CompoundCrossoverDriver {
  driverNumber: string;
  ltoeSec: number;
}

export interface WeatherCompoundCrossoverPayload {
  feed: "weather.compound_crossover_alert";
  sessionId: string | null;
  event: "weather.compound_crossover_alert";
  lap: number;
  utc: string;
  direction: "inter_to_slick";
  confidence: number;
  evidence: {
    drivers_on_slick: CompoundCrossoverDriver[];
    drivers_on_inter: CompoundCrossoverDriver[];
  };
  rain_cleared_lap: number | null;
  estimated_laps_until_all_on_slick: number | null;
}

// ---------------------------------------------------------------------------
// Webhook payload envelope
// ---------------------------------------------------------------------------

// Normalized per-driver feeds (timingdata, etc.) use `drivers` instead of `data`.
export interface WebhookPayload<T = unknown> {
  feed: string;
  sessionId: string | null;
  /** Present for session-wide feeds and raceevent. */
  data?: T;
  /** Present for per-driver normalized feeds (timingdata, stintdata, etc.). */
  drivers?: (DriverRef & { [key: string]: unknown })[];
}

// raceevent synthetic payload envelope
export interface RaceEventPayload {
  feed: "raceevent";
  sessionId: string | null;
  event: RaceEventType;
  lap: number;
  utc: string;
  data: Record<string, unknown>;
}

export type RaceEventType =
  | "session.start"
  | "overtake"
  | "pit.entry"
  | "pit.exit"
  | "lead.change"
  | "safety.car.deployed"
  | "safety.car.cleared"
  | "fastest.lap"
  | "retirement";

export interface CreateWebhookOptions {
  feedId: string;
  webhookUrl: string;
  webhookMethod?: "post" | "put";
  filters?: WebhookFilters;
}

export interface CreateWebhookResult {
  webhook: Webhook;
  webhookSecret?: string;
  tier: SubscriptionTier;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Data API types (/v1/data/*)
// ---------------------------------------------------------------------------

export interface Driver {
  driverId: string;
  forename: string;
  surname: string;
  nationality: string;
  dateOfBirth: string | null;
  currentNumber: number | null;
  tla: string | null;
  activeFromYear: number | null;
  activeToYear: number | null;
}

export interface DriverCareerStats {
  driverId: string;
  seasons: number;
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  championships: number;
  totalPoints: number;
}

export interface DriverResult {
  raceId: string;
  constructorId: string;
  grid: number;
  position: number | null;
  positionText: string;
  classification: string;
  points: number;
  lapsCompleted: number;
  finishTimeMs: number | null;
  gapToLeaderMs: number | null;
}

export interface DriverStanding {
  driverId: string;
  constructorId: string;
  points: number;
  position: number;
  wins: number;
}

export interface Constructor {
  constructorId: string;
  lineageId: string | null;
  name: string;
  nationality: string;
  activeFromYear: number | null;
  activeToYear: number | null;
}

export interface ConstructorStanding {
  constructorId: string;
  points: number;
  position: number;
  wins: number;
}

export interface Circuit {
  circuitId: string;
  name: string;
  locality: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

export interface CircuitAnalytics {
  circuitId: string;
  [key: string]: unknown;
}

export interface Season {
  year: number;
  races: number;
}

export interface Race {
  raceId: string;
  seasonYear: number;
  circuitId: string;
  roundNumber: number | null;
  name: string;
  officialName: string | null;
  raceDate: string;
  dataQualityTier: string | null;
  eventId: string | null;
}

export interface RaceResult {
  driverId: string;
  constructorId: string;
  grid: number;
  position: number | null;
  positionText: string;
  classification: string;
  points: number;
  lapsCompleted: number;
  finishTimeMs: number | null;
  gapToLeaderMs: number | null;
  fastestLap: number | null;
  isOfficial: boolean;
}

export interface QualifyingResult {
  driverId: string;
  constructorId: string;
  position: number;
  q1Ms: number | null;
  q2Ms: number | null;
  q3Ms: number | null;
}

export interface PitStop {
  driverId: string;
  stopNumber: number;
  lap: number;
  durationMs: number | null;
}

export interface TyreStint {
  driverId: string;
  stintNumber: number;
  lapStart: number;
  lapEnd: number | null;
  compound: string;
  tyreAgeAtStart: number;
}

export interface LapTime {
  driverId: string;
  lapNumber: number;
  lapTimeMs: number | null;
  position: number | null;
}

export interface WeatherEntry {
  lap: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Insights API types (/v1/insights/*)
// ---------------------------------------------------------------------------

export interface InsightRace {
  raceId: string;
  name: string;
  raceDate: string;
  seasonYear: number;
  circuitId: string;
}

export interface LapAnalyticsEntry {
  driverId: string | null;
  raceLap: number | null;
  pitStopProbability: number | null;
  pitRecommended: boolean | null;
  safetyCarProbability: number | null;
  overtakeProbability: number | null;
  undercutProbability: number | null;
  tireHealth: number | null;
  cliffLapPredicted: number | null;
  cliffRisk: string | null;
  degRateSecPerLap: number | null;
  compound: string | null;
  tyreLife: number | null;
  fuelCorrectedTimeSec: number | null;
  ltoeSec: number | null;
  expectedLapTimeSec: number | null;
  winProbability: number | null;
  ecp: number | null;
  ecpa: number | null;
}

export interface InsightBundle {
  race: InsightRace & { officialName: string | null };
  summary: {
    status: string;
    processedAt: string | null;
    maxSpeedKph: number | null;
    maxSpeedDriver: string | null;
    avgThrottlePct: number | null;
    avgBrakePct: number | null;
    topAggressionDriver: string | null;
    topAggressionScore: number | null;
    analyticsQualityScore: number | null;
  };
  driverMap: Record<string, { abbr: string; name: string; team: string; colour: string }>;
  analytics: LapAnalyticsEntry[];
  pitstops: Array<{ driverId: string; stopNumber: number; lap: number; durationMs: number | null }>;
  tyres: TyreStint[];
  lapTimes: Array<{ driverId: string; lapNumber: number; lapTimeMs: number | null; position: number | null }>;
  scLaps: number[];
  scLapsDataAvailable: boolean;
}

export interface ModelMetaEntry {
  prAuc: number | null;
  brierScore: number | null;
  ece: number | null;
  f1Score: number | null;
  threshold: number | null;
  trainRows: number | null;
  trainedAt: string;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Telemetry API types (/v1/telemetry/*)
// ---------------------------------------------------------------------------

export interface LapTelemetryEntry {
  lapNumber: number;
  driverId: string;
  avgSpeedKph: number | null;
  maxSpeedKph: number | null;
  avgThrottlePct: number | null;
  fullThrottlePct: number | null;
  brakePct: number | null;
  topGear: number | null;
  drsPct: number | null;
  aggressionIdx: number | null;
  sampleCount: number;
}

export interface TelemetrySummary {
  status: string;
  processedAt: string | null;
  totalSamples: number | null;
  maxSpeedKph: number | null;
  maxSpeedDriver: string | null;
  avgThrottlePct: number | null;
  avgBrakePct: number | null;
  topAggressionDriver: string | null;
  topAggressionScore: number | null;
}

// ---------------------------------------------------------------------------
// Fantasy API types (/v1/fantasy/*)
// ---------------------------------------------------------------------------

export interface PitTimeStop {
  driver: string;
  tla: string;
  team: string;
  pitLaneTimeSec: number;
  lap: number;
}

export interface FantasyScoreEntry {
  driver: string;
  tla: string;
  team: string;
  breakdown: {
    racePosPoints: number;
    qualiPosPoints: number | null;
    q3Bonus: number | null;
    positionsGained: number | null;
    positionsGainedPoints: number;
    fastestLapPoints: number;
    beatTeammateRace: number;
    beatTeammateQuali: number;
    dnfPenalty: number;
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Billing types (/v1/billing/*)
// ---------------------------------------------------------------------------

export interface TierConfig {
  tier: string;
  label: string;
  price: string;
  period: string;
  description: string;
  idealFor: string;
  isBeta: boolean;
  isRecommended: boolean;
  supportLevel: string;
  liveFeeds: boolean;
  sla: string | null;
  maxWebhooks: number;
  dailyDeliveryLimit: number;
  hmacEnabled: boolean;
  apiRateLimitPerHour: number;
  dataPageSizeLimit: number;
  simulateReplaysPerMonth: number;
  analyticsEnrichment: boolean;
  maxSseConnections: number;
}

export interface BillingPlan {
  tier: string;
  openBeta: boolean;
  stripePeriodEnd: string | null;
  analyticsEnrichment: boolean;
  limits: {
    maxWebhooks: number;
    dailyDeliveryLimit: number | "unlimited";
    hmacEnabled: boolean;
    analyticsEnrichment: boolean;
  };
  usage: {
    period: string;
    webhookCount: number;
    webhooksRemaining: number | null;
    dailyDeliveries: number;
    dailyRemaining: number | null;
    failureCount: number;
  };
}

export interface RaceHooksConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  timeoutMs?: number;
  /**
   * Webhook signing secret (from the webhook create response).
   * When provided, enables `constructEvent`, `safeConstructEvent`, and
   * `webhookHandler` on the `RaceHooks` instance.
   */
  secret?: string;
  /**
   * Reject deliveries whose `X-RaceHooks-Sent-At` timestamp is older than
   * this many seconds (replay protection). `0` / omitted disables the check.
   */
  toleranceSeconds?: number;
}
