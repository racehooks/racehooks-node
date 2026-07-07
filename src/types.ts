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

// ===========================================================================
// Feed payloads — the webhook/SSE delivery contracts
//
// These mirror the RaceHooks server-side feed contracts one-for-one. Every
// payload follows the payload standard: a fixed `{ feed, sessionId, utc, <body> }`
// envelope, camelCase fields, and full `DriverRef` driver identity (never a
// reduced `{ driverNumber, driverId }`). The `feed` discriminator equals the
// canonical `feedId` (hyphenated, e.g. "events.race", "analytics.team-points",
// "weather.tire-mismatch").
// ===========================================================================

/** Replay/simulation metadata, present only on Simulate (historical replay) deliveries. */
export interface ReplayMeta {
  simulationId: string;
  originalSessionId: string;
  /** "HH:MM:SS.mmm" elapsed since session start; present in replay mode. */
  sessionElapsed?: string;
}

/** A lap time as delivered inside event payloads: display string + milliseconds. */
export interface EventLapTime {
  display: string; // e.g. "1:27.412"
  ms: number;
}

/** A gap/interval inside event payloads: display + seconds (null when non-numeric, e.g. "1 LAP"). */
export interface EventGapValue {
  display: string; // e.g. "+4.218"
  seconds: number | null;
}

/** Analytics feeds are per-lap ML snapshots: the base envelope plus `raceId` + `lap`. */
export interface AnalyticsEnvelope<F extends string> {
  feed: F;
  sessionId: string | null;
  raceId: string | null;
  lap: number;
  utc: string;
  _replay?: ReplayMeta;
}

// ---------------------------------------------------------------------------
// analytics.strategy — per-lap race-strategy snapshot (race/sprint)
// ---------------------------------------------------------------------------

/** Lap-Time-Over-Expectation: pace vs the model's expectation, fuel/tyre/traffic aware. */
export interface StrategyLtoe {
  ltoeSec: number;
  expectedLapTimeSec: number;
  actualLapTimeSec: number;
  confidenceScale: number;
  expectedLapTimeP10Sec?: number;
  expectedLapTimeP90Sec?: number;
  paceUncertaintySec?: number;
}

export interface StrategyTyreCliff {
  cliffProbability: number;
  cliffWithinLaps: number;
  cliffDetected: boolean;
  lapsToCliff: number;
}

export interface StrategyTireHealth {
  tireHealth: number;
  degRateSecPerLap: number;
  stintLap: number;
}

export interface StrategyDnfRisk {
  dnfRiskScore: number;
  lapsTo50PctSurvival: number | null;
  constructorHazardRate: number;
}

export interface StrategyPitSurvival {
  medianStintLength: number;
  pitWithin5Prob: number;
  expectedResidualLaps: number;
}

/** Calibrated undercut timing call: what to DO and the calibrated P(ends ahead). */
export interface StrategyUndercutCall {
  recommend: string;
  strikeInLaps: number;
  pSuccess: number;
  pNow: number;
}

export interface StrategyUndercutThreat {
  score: number;
  viable: boolean;
  gapToCarAheadSec: number;
  estimatedDeltaSec: number;
  probability?: number;
  call?: StrategyUndercutCall;
}

/** Feedback-Stackelberg pit-sequencing equilibrium, composed as an attributed story. */
export interface StrategyPitEquilibrium {
  action: string;
  rivalResponse: string;
  equilibriumGapSec: number;
  rivalPosition: number;
  why: { label: string; detail: string; tone: string };
}

export interface StrategyDriver extends DriverRef {
  pitStopProbability?: number;
  pitRecommended?: boolean;
  overtakeProbability?: number;
  paceMode?: string;
  cleanPaceSec?: number;
  pitStopCount?: number;
  ltoe?: StrategyLtoe;
  ltoeConfidenceFlag?: string;
  tyreCliff?: StrategyTyreCliff;
  tireHealth?: StrategyTireHealth;
  dnfRisk?: StrategyDnfRisk;
  pitSurvival?: StrategyPitSurvival;
  undercutThreat?: StrategyUndercutThreat;
  pitEquilibrium?: StrategyPitEquilibrium;
}

export interface StrategyPayload extends AnalyticsEnvelope<"analytics.strategy"> {
  regulationsEra: string;
  safetyCarProbability?: number;
  vscProbability?: number;
  fullScProbability?: number;
  /** Rich cross-car intelligence + weather impact — complex sub-payloads, typed loosely for now. */
  competitorIntelligence?: Record<string, unknown>;
  weatherImpact?: Record<string, unknown>;
  drivers: StrategyDriver[];
}

// ---------------------------------------------------------------------------
// analytics.race-odds — per-lap CTMC outcome probabilities (race/sprint)
// ---------------------------------------------------------------------------

export interface RaceOddsPositionChangeWindow {
  gainAtLeast1: number;
  loseAtLeast1: number;
  holdPosition: number;
}

export interface RaceOddsPositionChange {
  next3Laps: RaceOddsPositionChangeWindow;
  next5Laps: RaceOddsPositionChangeWindow;
  next10Laps: RaceOddsPositionChangeWindow;
}

export interface RaceOddsDriver extends DriverRef {
  position?: number;
  /** Probability of finishing in each grid slot (index 0 = P1). */
  positionDistribution?: number[];
  mostLikelyPosition?: number;
  expectedPoints?: number;
  pointsFinishProbability?: number;
  gridPosition?: number;
  expectedPlaceDifferential?: number;
  podiumProbability?: number;
  top6Probability?: number;
  top10Probability?: number;
  lapsLedExpected?: number;
  positionChange?: RaceOddsPositionChange;
  h2hVsTeammate?: number;
  fastestLapProbability?: number;
}

/** Same-team head-to-head: probability each team-mate finishes ahead of the other. */
export interface RaceOddsPair {
  constructorId: string;
  driverA: DriverRef;
  driverB: DriverRef;
  pABeatsB: number;
  pBBeatsA: number;
  pTie: number;
}

export interface RaceOddsPayload extends AnalyticsEnvelope<"analytics.race-odds"> {
  drivers: RaceOddsDriver[];
  pairs?: RaceOddsPair[];
}

// ---------------------------------------------------------------------------
// analytics.true-pace — fuel/tyre/traffic-stripped pace ranking (race/sprint)
// ---------------------------------------------------------------------------

export interface TruePaceDriver extends DriverRef {
  /** Deconvolved pace in seconds (lower = faster). */
  truePaceSec: number;
  /** Pace relative to the field median in seconds (negative = faster than the field). */
  truePaceRelSec: number;
  /** 1 = fastest. */
  rank: number;
}

export interface TruePacePayload extends AnalyticsEnvelope<"analytics.true-pace"> {
  drivers: TruePaceDriver[];
}

// ---------------------------------------------------------------------------
// analytics.gap-projection — Monte Carlo projected gap to leader (race/sprint)
// ---------------------------------------------------------------------------

export interface GapProjectionDriver extends DriverRef {
  /** Live gap to the leader right now, in seconds (leader = 0). */
  currentGapToLeaderSec: number;
  /** Mean projected gap to the leader at race end, in seconds. */
  expectedGapToLeaderSec: number;
  p10GapSec: number;
  p25GapSec: number;
  p50GapSec: number;
  p75GapSec: number;
  p90GapSec: number;
  /** 0–1 probability the driver is lapped by the leader before the flag. */
  probabilityLapped: number;
}

export interface GapProjectionPayload extends AnalyticsEnvelope<"analytics.gap-projection"> {
  drivers: GapProjectionDriver[];
}

// ---------------------------------------------------------------------------
// analytics.winning-margin — projected P1–P2 winning margin (race/sprint)
// ---------------------------------------------------------------------------

export interface WinningMarginLeadBattle {
  leader: DriverRef;
  runnerUp: DriverRef;
  /** Current P1–P2 gap in seconds. */
  currentMarginSec: number;
  /** Expected P1–P2 gap at the flag (mixture of no-SC drift + post-SC reset). */
  expectedFinalMarginSec: number;
  p10MarginSec: number;
  p50MarginSec: number;
  p90MarginSec: number;
  probabilityMarginAbove5: number;
  probabilityMarginAbove10: number;
  /** P(final margin < 3s) — close-finish probability. */
  probabilityMarginBelow3: number;
  /** P(safety car before race end) — the dominant driver of margin collapse. */
  scCollapseRisk: number;
}

export interface WinningMarginPayload extends AnalyticsEnvelope<"analytics.winning-margin"> {
  leadBattle: WinningMarginLeadBattle;
}

// ---------------------------------------------------------------------------
// analytics.race-preview — two-stage pre-race preview (practice / grid)
// ---------------------------------------------------------------------------

export interface RacePreviewPracticeDriver extends DriverRef {
  practicePace: {
    /** Relative pace vs the session benchmark (lower = faster). */
    relPacePct: number;
    longRunDone: boolean;
    primaryCompound: string | null;
    lapsCompleted: number;
    sessionType: string;
    /** 1 = fastest; long-run drivers rank ahead of short-run-only drivers. */
    paceRank: number;
  };
}

export interface RacePreviewPracticePayload {
  feed: "analytics.race-preview";
  stage: "practice";
  eventId: string;
  raceId: string | null;
  /** Canonical RaceHooks circuit slug — never an upstream key. */
  circuitId: string;
  utc: string;
  _replay?: ReplayMeta;
  drivers: RacePreviewPracticeDriver[];
  strategy: {
    pitLaneDeltaSec: number | null;
    compoundDeg: { compound: string; degSecPerLap: number }[];
    /** Time cost of a safety-car lap at this circuit vs green pace (seconds). */
    scTimeCostSecPerLap: number;
    redFlagBaseRate: number;
  };
}

export interface RacePreviewPitStopCount {
  pOneStop: number;
  pTwoStop: number;
  pThreePlusStop: number;
  expectedStops: number;
}

export interface RacePreviewGridOrderEntry extends DriverRef {
  position: number;
  lapTimeMs: number | null;
  /** Furthest qualifying segment reached (Q1/Q2/Q3), or null. */
  segment: string | null;
}

export interface RacePreviewGridDriver extends DriverRef {
  /** Session classification — the official grid may differ after penalties. */
  qualifyingPosition: number;
  practicePaceRank?: number;
  /** practicePaceRank − qualifyingPosition: positive = raced faster in practice than qualified. */
  paceVsGridDelta?: number;
  pitStopCount?: RacePreviewPitStopCount;
}

export interface RacePreviewGridPayload {
  feed: "analytics.race-preview";
  stage: "grid";
  eventId: string;
  raceId: string | null;
  circuitId: string;
  utc: string;
  _replay?: ReplayMeta;
  /** Derived from the FIA 305 km rule and circuit length; null when length unknown. */
  scheduledRaceLaps: number | null;
  qualifying: {
    poleLapMs: number | null;
    /** Measured P1–P2 qualifying gap (ms); null when either time is missing. */
    poleMarginMs: number | null;
    order: RacePreviewGridOrderEntry[];
  };
  drivers: RacePreviewGridDriver[];
}

export type RacePreviewPayload = RacePreviewPracticePayload | RacePreviewGridPayload;

// ---------------------------------------------------------------------------
// analytics.race-duration — projected race duration + red-flag/overtime risk
// ---------------------------------------------------------------------------

export interface RaceDurationPayload extends AnalyticsEnvelope<"analytics.race-duration"> {
  /** Expected total race duration (minutes): elapsed + remaining racing time + SC/red-flag loss. */
  expectedRaceTimeMinutes: number;
  p10RaceTimeMinutes: number;
  p90RaceTimeMinutes: number;
  /** Expected winner average lap time over the remaining laps (degradation-adjusted, seconds). */
  expectedWinnerLapTimeSec: number;
  /** Rule-based P(red flag before race end). */
  probabilityRedFlag: number;
  /** P(race exceeds the 2-hour FIA time limit). */
  probabilityOvertimeSession: number;
  /** Safety-car deployments so far this race. */
  scDeployedCount: number;
}

// ---------------------------------------------------------------------------
// analytics.tire-strategy — sparse next-compound probabilities (per pit approach)
// ---------------------------------------------------------------------------

export interface NextCompoundProbability {
  soft: number;
  medium: number;
  hard: number;
  /** High-recall merged Inter+Wet class; zeroed on a dry track (renormalised to the dry view). */
  wetWeather: number;
  /** Dry-only renormalised view (sums to 1 across soft/medium/hard). */
  dryCompoundProbabilities: { soft: number; medium: number; hard: number };
}

export interface TireStrategyDriver extends DriverRef {
  /** 0–1 probability this driver pits soon (why they're in the sparse set). */
  pitProbability: number;
  nextCompoundProbability: NextCompoundProbability;
}

export interface TireStrategyPayload extends AnalyticsEnvelope<"analytics.tire-strategy"> {
  drivers: TireStrategyDriver[];
}

// ---------------------------------------------------------------------------
// analytics.team-points — constructor points outlook (race/sprint)
// ---------------------------------------------------------------------------

export interface TeamPointsConstructor {
  /** Canonical RaceHooks constructor slug (e.g. "red-bull", "ferrari"). */
  constructorId: string;
  /** Expected combined points from both drivers (discrete convolution of joint position dists). */
  expectedConstructorPoints: number;
  /** P(both drivers finish in the points / top 10). */
  scoringBothDriversProbability: number;
  /** P(both drivers finish on the podium). */
  podiumBothDriversProbability: number;
  /** P(team scores exactly K combined points), index K = 0…44. */
  pointsDistribution: number[];
}

export interface TeamPointsPayload extends AnalyticsEnvelope<"analytics.team-points"> {
  constructors: TeamPointsConstructor[];
}

// ---------------------------------------------------------------------------
// analytics.championship-probability — post-race WDC/WCC outlook (season)
// ---------------------------------------------------------------------------

export interface ChampionshipProbabilityDriver extends DriverRef {
  /** Season championship win probability (0–1). */
  scwp: number;
  /** Probability of a top-3 championship finish (0–1). */
  scwpTop3: number;
  expectedFinalPoints: number;
  /** Points behind the championship leader. */
  championshipDeficit: number;
}

export interface ChampionshipProbabilityConstructor {
  /** Canonical RaceHooks constructor slug. */
  constructorId: string;
  /** Constructors' championship win probability (0–1). */
  ccwp: number;
  ccwpTop3: number;
  expectedFinalPoints: number;
  championshipDeficit: number;
}

export interface ChampionshipProbabilityPayload {
  feed: "analytics.championship-probability";
  /** Full season the projection covers. */
  seasonYear: number;
  /** The most recent official race the probabilities are computed through. */
  afterRaceId: string;
  simulationsRun: number;
  utc: string;
  _replay?: ReplayMeta;
  drivers: ChampionshipProbabilityDriver[];
  constructors: ChampionshipProbabilityConstructor[];
}

// ---------------------------------------------------------------------------
// analytics.qualifying — per-segment qualifying model (Q1/Q2/Q3)
// ---------------------------------------------------------------------------

export interface QualifyingSectorDriver extends DriverRef {
  /** Probability this driver is fastest in the sector. */
  pFastest: number;
  predictedDeltaMs: number;
  sigma: number;
}

export interface QualifyingElimination {
  pEliminatedQ1: number;
  pEliminatedQ2: number;
  pReachesQ3: number;
  projectedFinalQualifyingPosition: number;
}

export interface QualifyingAnalyticsDriver extends DriverRef {
  sector1DeltaMs: number | null;
  sector2DeltaMs: number | null;
  sector3DeltaMs: number | null;
  elimination?: QualifyingElimination;
}

export interface QualifyingAnalyticsPayload {
  feed: "analytics.qualifying";
  sessionId: string | null;
  raceId: string | null;
  utc: string;
  _replay?: ReplayMeta;
  /** "Q1" | "Q2" | "Q3". */
  segment: string;
  /** Canonical RaceHooks circuitId (slug) — never an upstream key. */
  circuitId: string;
  sectors: {
    s1?: { drivers: QualifyingSectorDriver[] };
    s2?: { drivers: QualifyingSectorDriver[] };
    s3?: { drivers: QualifyingSectorDriver[] };
  };
  poleMarginAbove100ms?: number;
  poleMarginAbove300ms?: number;
  poleLeader?: DriverRef;
  drivers: QualifyingAnalyticsDriver[];
}

// ---------------------------------------------------------------------------
// analytics.sector-pace — per-driver sector anomaly alert (race/sprint)
// ---------------------------------------------------------------------------

export interface SectorPaceReading {
  /** Current sector time minus the rolling clean-lap median baseline (seconds). */
  deltaSec: number;
  /** Rolling median of the last N clean laps for this sector (ms). */
  baselineMs: number;
  /** Number of clean laps contributing to the baseline window. */
  cleanLapCount: number;
  /** Raw sector time this lap (ms). */
  currentMs: number;
}

export type SectorAnomalyCause = "RAIN" | "TIRE_CLIFF" | "INCIDENT" | "UNKNOWN";
export type SectorAnomalyLevel = "WARNING" | "CRITICAL";

export interface SectorPaceData {
  driver: DriverRef;
  raceLap: number;
  s1: SectorPaceReading | null;
  s2: SectorPaceReading | null;
  s3: SectorPaceReading | null;
  anomalyDetected: boolean;
  /** Which sector triggered the anomaly (1/2/3), or null. */
  anomalySector: 1 | 2 | 3 | null;
  anomalyLevel: SectorAnomalyLevel | null;
  classifiedCause: SectorAnomalyCause | null;
  /** 0–1 confidence the anomaly is rain-driven. */
  rainConfidence: number;
  /** True when ≥3 drivers show the same-sector anomaly on the same lap (weather, not car-specific). */
  crossDriverCorrelated: boolean;
  /** Other drivers flagged in the same sector this lap — full DriverRef each. */
  driversAffectedSameSector: DriverRef[];
}

export interface SectorPacePayload {
  feed: "analytics.sector-pace";
  sessionId: string | null;
  lap: number;
  utc: string;
  _replay?: ReplayMeta;
  data: SectorPaceData;
}

// ---------------------------------------------------------------------------
// analytics.battle — a single on-track battle (race/sprint)
// ---------------------------------------------------------------------------

export interface BattleForecast {
  passProbabilityPerLap: number;
  pPassWithinHorizon: number;
  horizonLaps: number;
}

export interface BattleData {
  attacker: DriverRef;
  defender: DriverRef;
  currentGapSec: number;
  catchRateSecPerLap: number;
  lapsToStrikingDistance: number;
  battleStatus: string;
  forecast: BattleForecast | null;
}

export interface BattlePayload {
  feed: "analytics.battle";
  sessionId: string | null;
  lap: number;
  utc: string;
  _replay?: ReplayMeta;
  data: BattleData;
}

// ---------------------------------------------------------------------------
// analytics.pit-window — per-driver optimal pit window (race/sprint)
// ---------------------------------------------------------------------------

export type PitWindowStatus = "OPEN" | "URGENT" | "CLOSING" | "CLOSED";

export interface PitWindowData {
  driver: DriverRef;
  raceLap: number;
  status: PitWindowStatus;
  /** 0–1 pit-stop probability from the pit model. */
  pitProbability: number;
  undercutViable: boolean;
  /** Tyre-cliff proximity: NONE | GRAINING | THERMAL | BLISTERING_RISK | BLISTERING. */
  cliffRisk: string;
  /** Event override that opened the window early: "VSC_WINDOW" | "SC_WINDOW" | "LEADER_PITTED", or null. */
  overrideReason: string | null;
  /** Estimated seconds saved by pitting under the current VSC/SC; null when not applicable. */
  vscNetDeltaSec: number | null;
  /** The driver's current pit-stop count. */
  pitCount: number;
}

export interface PitWindowPayload {
  feed: "analytics.pit-window";
  sessionId: string | null;
  lap: number;
  utc: string;
  _replay?: ReplayMeta;
  data: PitWindowData;
}

// ---------------------------------------------------------------------------
// analytics.track-conditions — per-sector surface state (race/sprint)
// ---------------------------------------------------------------------------

export type SectorCondition = "DRY" | "WET" | "DRYING" | "UNKNOWN";

export interface TrackConditionsData {
  sector1: SectorCondition;
  sector2: SectorCondition;
  sector3: SectorCondition;
  /** All three sectors classified wet. */
  fullCircuitWet: boolean;
  /** Any sector wet AND slick runners losing >~2s — the intermediate window. */
  intermediateWindowOpen: boolean;
  /** Slick cars now faster than intermediates in ≥1 sector — the crossover call. */
  crossoverRecommended: boolean;
  lastUpdatedLap: number;
}

export interface TrackConditionsPayload {
  feed: "analytics.track-conditions";
  sessionId: string | null;
  lap: number;
  utc: string;
  _replay?: ReplayMeta;
  data: TrackConditionsData;
}

// ---------------------------------------------------------------------------
// analytics.pit-quality — per-stop pit crew performance (race/sprint)
// ---------------------------------------------------------------------------

export type PitQuality = "EXCEPTIONAL" | "NORMAL" | "SLOW" | "CRITICAL";

export interface PitQualityData {
  driver: DriverRef;
  raceLap: number;
  /** Measured stationary time for this stop (seconds). */
  stationaryTimeSec: number;
  /** The team's rolling average stationary time this session, before this stop. */
  teamSessionAverageSec: number;
  /** This stop minus the team average — positive = slower than the crew's norm. */
  vsTeamSessionAverageSec: number;
  quality: PitQuality;
  /** nth stop this session for this driver. */
  stopNumber: number;
}

export interface PitQualityPayload {
  feed: "analytics.pit-quality";
  sessionId: string | null;
  lap: number;
  utc: string;
  _replay?: ReplayMeta;
  data: PitQualityData;
}

// ---------------------------------------------------------------------------
// weather.* alert cluster — derived weather feeds
// All discriminate on `feed` alone and use camelCase throughout. Driver
// references are always full DriverRef.
// ---------------------------------------------------------------------------

/** Shared envelope for the weather alerts: base + `lap` (no raceId). */
export interface WeatherAlertEnvelope<F extends string> {
  feed: F;
  sessionId: string | null;
  lap: number;
  utc: string;
  _replay?: ReplayMeta;
}

// weather.rain-onset / weather.rain-cleared — session-level rainfall state change.
export interface RainEventData {
  lap: number;
  precipRateMmhr: number | null;
  /** Only populated on rain-cleared. */
  rainStartLap: number | null;
  /** Only populated on rain-cleared. */
  durationLaps: number | null;
  trackTempC: number | null;
  airTempC: number | null;
  humidity: number | null;
}
export interface RainOnsetPayload extends WeatherAlertEnvelope<"weather.rain-onset"> {
  data: RainEventData;
}
export interface RainClearedPayload extends WeatherAlertEnvelope<"weather.rain-cleared"> {
  data: RainEventData;
}

// weather.forecast-update — precipitation forecast change (session-level).
export interface WeatherForecastSlot {
  timeUtc: string;
  precipRateMmhr: number;
  precipProbabilityPct: number;
}
export interface ForecastUpdatePayload extends WeatherAlertEnvelope<"weather.forecast-update"> {
  /** RaceHooks capability label — "forecast" (numerical model) or "radar" (ground-radar nowcast). */
  source: "forecast" | "radar";
  currentPrecipRateMmhr: number;
  precipProbabilityPct: number;
  rainExpectedInMin: number | null;
  next60min: WeatherForecastSlot[];
}

// weather.tire-mismatch — per-driver wet-tyre alert (slick-shod with rain falling/imminent).
export interface TireMismatchPayload extends WeatherAlertEnvelope<"weather.tire-mismatch"> {
  driver: DriverRef;
  currentCompound: string;
  severity: string;
  trigger: string;
  expectedWetOnsetLap: number | null;
  rainProbabilityNext5Laps: number;
  intermediateWindowOpen: boolean;
}

// weather.strategy-divergence — wet-vs-dry compound-group split during active rain.
export interface StrategyDivergenceGroup {
  count: number;
  drivers: DriverRef[];
  avgLapDeltaVsBaselineSec: number;
}
export interface StrategyDivergencePayload extends WeatherAlertEnvelope<"weather.strategy-divergence"> {
  data: {
    onWetCompounds: StrategyDivergenceGroup;
    onDryCompounds: StrategyDivergenceGroup;
    /** "wet" | "dry" | "neutral". */
    favoredGroup: string;
  };
}

// weather.compound-crossover — slicks becoming faster than inters after rain clears.
export interface CrossoverDriver extends DriverRef {
  ltoeSec: number;
}
export interface CompoundCrossoverPayload extends WeatherAlertEnvelope<"weather.compound-crossover"> {
  direction: string;
  confidence: number;
  evidence: {
    driversOnSlick: CrossoverDriver[];
    driversOnInter: CrossoverDriver[];
  };
  rainClearedLap: number | null;
  estimatedLapsUntilAllOnSlick: number | null;
}

// ---------------------------------------------------------------------------
// results.race-summary — post-race telemetry summary (once, after CarData)
// NOTE: predates the standard `feed` envelope and carries a `type` discriminator.
// ---------------------------------------------------------------------------

export interface RaceSummaryLinks {
  summary: string;
  laps: string;
  stints: string;
  aggression: string;
}

export interface RaceSummaryPayload {
  type: "race.summary.complete";
  raceId: string;
  raceName: string;
  processedAt: string;
  totalSamples: number;
  maxSpeedKph: number | null;
  /** Driver who set the race's top speed — full DriverRef, or null. */
  maxSpeedDriver: DriverRef | null;
  avgThrottlePct: number | null;
  avgBrakePct: number | null;
  /** Highest mean-aggression driver of the race — full DriverRef, or null. */
  topAggressionDriver: DriverRef | null;
  topAggressionScore: number | null;
  /** RaceHooks REST links into the full telemetry detail. */
  _links: RaceSummaryLinks;
}

// ===========================================================================
// events.race — synthetic race events (feed: "events.race")
// A discriminated union keyed on `event`. Every payload nests a full DriverRef.
// ===========================================================================

export interface OvertakeParticipant extends DriverRef {
  newPosition: number;
  prevPosition: number;
}

export type QualifyingSegment = "Q1" | "Q2" | "Q3" | null;

export interface SessionStartData {
  sessionName: string;
  sessionType: string;
  totalLaps?: number;
}
export interface SessionCompleteData {
  sessionName: string;
  sessionType: string;
  winner?: DriverRef;
}
export interface SessionFinalisedData {
  sessionName: string;
  sessionType: string;
}
export interface SafetyCarDeployedData {
  type: "full" | "virtual";
  previousStatus: "green" | "yellow";
  leader?: DriverRef;
}
export interface SafetyCarClearedData {
  previousType: "full" | "virtual" | "unknown";
  status: "ending" | "cleared";
  leader?: DriverRef;
}
export interface RedFlagDeployedData {
  previousStatus: "green" | "yellow" | "safety_car" | "virtual_safety_car";
}
export interface RedFlagRestartScData {
  restartType: "standing" | "rolling";
}
export interface RedFlagClearedData {
  restartType: "rolling";
}
export interface OvertakeData {
  overtakingDriver: OvertakeParticipant;
  overtakenDriver?: OvertakeParticipant;
}
export interface LeadChangeData {
  newLeader: DriverRef;
  previousLeader?: DriverRef;
  viaOvertake: boolean;
}
export interface FastestLapData {
  driver: DriverRef;
  lapTime: EventLapTime;
  previousBest?: { driver: DriverRef; lapTime: EventLapTime };
}
export interface PositionsChangedData {
  driver: DriverRef;
  gridPosition: number;
  currentPosition: number;
  positionsGained: number; // negative for positions.lost
}
export interface PitEntryData {
  driver: DriverRef;
  positionBeforePit: number;
  stopNumber: number;
  compound: string;
  tyreAge: number;
}
export interface PitExitData {
  driver: DriverRef;
  stopNumber: number;
  positionAfterPit: number;
}
export interface RetirementData {
  driver: DriverRef;
  positionAtRetirement: number;
  pitsCompleted: number;
}
export interface StrategySignalData {
  driver: DriverRef;
  signals: string[];
  radioEventsLast3Min: number;
  currentPosition: number;
  compound: string;
  tyreAge: number;
  tireHealth?: number;
  pitStopProbability?: number;
}
export interface BattleProximityData {
  attackingDriver: DriverRef;
  defendingDriver?: DriverRef;
  gapSeconds: number;
  closingRateSecPerLap: number;
  /** Attacker within the ≤1s window (2026 Manual Override boost — the DRS successor). */
  overrideAvailable: boolean;
  overrideRangeInLaps?: number;
}
export interface QualifyingLapImprovementData {
  driver: DriverRef;
  lapTime: EventLapTime;
  improvementMs: number;
  position: number;
  segment: string;
  lap: number;
}
export interface QualifyingHotLapStartedData {
  driver: DriverRef;
  sector1Ms: number;
  sector1VsPbMs: number;
  segment: QualifyingSegment;
}
export interface QualifyingHotLapAbortedData {
  driver: DriverRef;
  reason: string;
  segment: QualifyingSegment;
}
export interface QualifyingSegmentStartData {
  segment: string;
  part: number;
  utc: string;
}
export interface QualifyingSegmentEndData {
  segment: string;
  part: number;
  utc: string;
}
export interface PitStopCompleteData {
  driver: DriverRef;
  stopNumber: number;
  lap?: number;
  totalDurationMs?: number;
  stationaryMs?: number;
  pitLaneTravelMs?: number;
  pitLaneEntryUtc?: string;
  pitLaneExitUtc?: string;
  pitStopTimeMs?: number;
  pitLaneTimeMs?: number;
}
export interface PitFastestData {
  driver: DriverRef;
  pitLaneTimeSec: number;
  previousBest?: { driver: DriverRef; timeSec: number };
}
export interface OvertakeCountData {
  driver: DriverRef;
  cumulativeOvertakes: number;
}
export interface LapSeriesPositionData {
  driver: DriverRef;
  lap: number;
  newPosition: number;
  prevPosition: number;
  positionsGained: number;
}
export interface FastestLapSector {
  position: number;
  time: string;
}
export interface FastestLapSpeed {
  position: number;
  speedKmh: number;
}
export interface FastestLapStatsData {
  driver: DriverRef;
  lap: number;
  lapTime: EventLapTime;
  sectors: FastestLapSector[];
  speeds: { i1?: FastestLapSpeed; i2?: FastestLapSpeed; fl?: FastestLapSpeed; st?: FastestLapSpeed };
}
export interface SessionClockData {
  remaining: string | null;
  utc: string | null;
}
export interface SessionRestartScheduledData {
  resumeAt: string | null;
  resumeAtUtc: string | null;
  message: string;
  lap: number;
}
export interface OvertakeAttemptData {
  attackingDriver: DriverRef;
  defendingDriver?: DriverRef;
  gapSeconds?: number;
}
export interface DriverScoreUpdateData {
  driver: DriverRef;
  currentPosition: number | null;
  scores: Record<string, number>;
}
export interface TopThreeUpdateEntry {
  position: number;
  driver: DriverRef;
  lapTime: EventLapTime | null;
  gapToLeader: EventGapValue | null;
  overallFastest: boolean;
}
export interface TopThreeUpdateData {
  drivers: TopThreeUpdateEntry[];
}
export interface ChampionshipPredictionUpdateEntry {
  driver: DriverRef;
  currentPoints: number;
  projectedPoints: number;
  currentPosition: number;
  projectedPosition: number;
  delta: number;
}
export interface ChampionshipPredictionUpdateData {
  leadersChanged: boolean;
  drivers: ChampionshipPredictionUpdateEntry[];
}
export interface InvestigationOpenedData {
  cars: Array<{ number: string; tla: string; driverId: string; constructorId: string; name: string; team: string }>;
  deferred: boolean;
  rawMessage: string;
}
export type PenaltyType = "time" | "drive_through" | "stop_go";
export interface PenaltyAppliedData {
  driver: DriverRef;
  penaltyType: PenaltyType;
  seconds: number | null;
  reason: string | null;
  rawMessage: string;
}
export interface PenaltyServedData {
  driver: DriverRef;
  penaltyType: PenaltyType;
  seconds: number | null;
  reason: string | null;
  rawMessage: string;
}
export interface LapTimeDeletedData {
  driver: DriverRef;
  lapTime: string | null;
  turn: number;
  lapNumber: number | null;
  isPitLap: boolean;
  rawMessage: string;
}
export interface OvertakeSystemData {
  enabled: boolean;
}
export interface RaceCompletionMilestoneData {
  milestone: 25 | 50 | 75 | 90;
  currentLap: number;
  totalLaps: number;
}
export interface DoubleStopEntry {
  driver: DriverRef;
  stopNumber: number;
}
export interface TeamDoubleStopData {
  constructor: { constructorId: string; name: string };
  drivers: [DoubleStopEntry, DoubleStopEntry];
  lap: number;
}
export interface BattleTrainFormedData {
  cars: DriverRef[];
  gapChain: number[];
  lapsSustained: number;
  leadCar: DriverRef;
}
export interface StrategyCrossoverData {
  type: "undercut" | "overcut";
  pittedDriver: DriverRef;
  carGained: DriverRef;
  lapsBetweenStops: number;
  gapAtCrossoverSec: number;
}

type RaceEventPayloadBase = {
  feed: "events.race";
  sessionId: string | null;
  lap: number;
  utc: string;
  _replay?: ReplayMeta;
};

export type RaceEventPayload =
  | (RaceEventPayloadBase & { event: "session.start"; data: SessionStartData })
  | (RaceEventPayloadBase & { event: "session.complete"; data: SessionCompleteData })
  | (RaceEventPayloadBase & { event: "session.finalised"; data: SessionFinalisedData })
  | (RaceEventPayloadBase & { event: "safety.car.deployed"; data: SafetyCarDeployedData })
  | (RaceEventPayloadBase & { event: "safety.car.cleared"; data: SafetyCarClearedData })
  | (RaceEventPayloadBase & { event: "red.flag.deployed"; data: RedFlagDeployedData })
  | (RaceEventPayloadBase & { event: "red.flag.restart.sc"; data: RedFlagRestartScData })
  | (RaceEventPayloadBase & { event: "red.flag.cleared"; data: RedFlagClearedData })
  | (RaceEventPayloadBase & { event: "overtake"; data: OvertakeData })
  | (RaceEventPayloadBase & { event: "lead.change"; data: LeadChangeData })
  | (RaceEventPayloadBase & { event: "fastest.lap"; data: FastestLapData })
  | (RaceEventPayloadBase & { event: "positions.gained"; data: PositionsChangedData })
  | (RaceEventPayloadBase & { event: "positions.lost"; data: PositionsChangedData })
  | (RaceEventPayloadBase & { event: "pit.entry"; data: PitEntryData })
  | (RaceEventPayloadBase & { event: "pit.exit"; data: PitExitData })
  | (RaceEventPayloadBase & { event: "retirement"; data: RetirementData })
  | (RaceEventPayloadBase & { event: "strategy.signal"; data: StrategySignalData })
  | (RaceEventPayloadBase & { event: "battle.proximity"; data: BattleProximityData })
  | (RaceEventPayloadBase & { event: "qualifying.lap_improvement"; data: QualifyingLapImprovementData })
  | (RaceEventPayloadBase & { event: "qualifying.hot_lap.started"; data: QualifyingHotLapStartedData })
  | (RaceEventPayloadBase & { event: "qualifying.hot_lap.aborted"; data: QualifyingHotLapAbortedData })
  | (RaceEventPayloadBase & { event: "qualifying.segment.start"; data: QualifyingSegmentStartData })
  | (RaceEventPayloadBase & { event: "qualifying.segment.end"; data: QualifyingSegmentEndData })
  | (RaceEventPayloadBase & { event: "pit.stop.complete"; data: PitStopCompleteData })
  | (RaceEventPayloadBase & { event: "pit.fastest"; data: PitFastestData })
  | (RaceEventPayloadBase & { event: "overtake.count"; data: OvertakeCountData })
  | (RaceEventPayloadBase & { event: "lapseries.position.gained"; data: LapSeriesPositionData })
  | (RaceEventPayloadBase & { event: "lapseries.position.lost"; data: LapSeriesPositionData })
  | (RaceEventPayloadBase & { event: "fastest.lap.stats"; data: FastestLapStatsData })
  | (RaceEventPayloadBase & { event: "session.clock.paused"; data: SessionClockData })
  | (RaceEventPayloadBase & { event: "session.clock.resumed"; data: SessionClockData })
  | (RaceEventPayloadBase & { event: "session.restart.scheduled"; data: SessionRestartScheduledData })
  | (RaceEventPayloadBase & { event: "overtake.attempt.started"; data: OvertakeAttemptData })
  | (RaceEventPayloadBase & { event: "overtake.attempt.resolved"; data: OvertakeAttemptData })
  | (RaceEventPayloadBase & { event: "driver.score.update"; data: DriverScoreUpdateData })
  | (RaceEventPayloadBase & { event: "top.three.update"; data: TopThreeUpdateData })
  | (RaceEventPayloadBase & { event: "championship.prediction.update"; data: ChampionshipPredictionUpdateData })
  | (RaceEventPayloadBase & { event: "investigation.opened"; data: InvestigationOpenedData })
  | (RaceEventPayloadBase & { event: "penalty.applied"; data: PenaltyAppliedData })
  | (RaceEventPayloadBase & { event: "penalty.served"; data: PenaltyServedData })
  | (RaceEventPayloadBase & { event: "lap.time.deleted"; data: LapTimeDeletedData })
  | (RaceEventPayloadBase & { event: "overtake.enabled"; data: OvertakeSystemData })
  | (RaceEventPayloadBase & { event: "overtake.disabled"; data: OvertakeSystemData })
  | (RaceEventPayloadBase & { event: "race.completion.milestone"; data: RaceCompletionMilestoneData })
  | (RaceEventPayloadBase & { event: "team.double.stop"; data: TeamDoubleStopData })
  | (RaceEventPayloadBase & { event: "battle.train.formed"; data: BattleTrainFormedData })
  | (RaceEventPayloadBase & { event: "strategy.crossover"; data: StrategyCrossoverData })
  | (RaceEventPayloadBase & { event: string; data: Record<string, unknown> }); // open variant for forward compat

/**
 * The known `events.race` event names carried by {@link RaceEventPayload}.
 * The feed is forward-compatible: new event names may arrive that are not in
 * this union, so `RaceEventPayload.event` stays `string` — use this for the
 * documented set.
 */
export type RaceEventType =
  | "session.start"
  | "session.complete"
  | "session.finalised"
  | "safety.car.deployed"
  | "safety.car.cleared"
  | "red.flag.deployed"
  | "red.flag.restart.sc"
  | "red.flag.cleared"
  | "overtake"
  | "lead.change"
  | "fastest.lap"
  | "positions.gained"
  | "positions.lost"
  | "pit.entry"
  | "pit.exit"
  | "retirement"
  | "strategy.signal"
  | "battle.proximity"
  | "qualifying.lap_improvement"
  | "qualifying.hot_lap.started"
  | "qualifying.hot_lap.aborted"
  | "qualifying.segment.start"
  | "qualifying.segment.end"
  | "pit.stop.complete"
  | "pit.fastest"
  | "overtake.count"
  | "lapseries.position.gained"
  | "lapseries.position.lost"
  | "fastest.lap.stats"
  | "session.clock.paused"
  | "session.clock.resumed"
  | "session.restart.scheduled"
  | "overtake.attempt.started"
  | "overtake.attempt.resolved"
  | "driver.score.update"
  | "top.three.update"
  | "championship.prediction.update"
  | "investigation.opened"
  | "penalty.applied"
  | "penalty.served"
  | "lap.time.deleted"
  | "overtake.enabled"
  | "overtake.disabled"
  | "race.completion.milestone"
  | "team.double.stop"
  | "battle.train.formed"
  | "strategy.crossover";

// ===========================================================================
// events.qualifying — qualifying-specific synthetic events (feed: "events.qualifying")
// ===========================================================================

export interface QualifyingSessionCompleteResult {
  driver: DriverRef;
  position: number;
  lapTime: EventLapTime;
  segment: string;
}
export interface QualifyingSessionCompleteData {
  sessionName: string;
  results: QualifyingSessionCompleteResult[];
}
export interface QualifyingDriverEliminatedData {
  driver: DriverRef;
  position: number;
  finalPosition: number;
  lapTime: EventLapTime;
  segment: string;
}
export interface QualifyingPolePositionData {
  driver: DriverRef;
  lapTime: EventLapTime;
  marginToP2Ms: number;
}
export interface QualifyingFrontRowResult {
  driver: DriverRef;
  position: number;
  lapTime: EventLapTime;
}
export interface QualifyingFrontRowData {
  results: QualifyingFrontRowResult[];
}

type QualifyingEventBase = {
  feed: "events.qualifying";
  sessionId: string | null;
  lap: number;
  utc: string;
  _replay?: ReplayMeta;
};

export type QualifyingEventPayload =
  | (QualifyingEventBase & { event: "qualifying.session_complete"; data: QualifyingSessionCompleteData })
  | (QualifyingEventBase & { event: "qualifying.lap_improvement"; data: QualifyingLapImprovementData })
  | (QualifyingEventBase & { event: "qualifying.driver_eliminated"; data: QualifyingDriverEliminatedData })
  | (QualifyingEventBase & { event: "qualifying.pole_position"; data: QualifyingPolePositionData })
  | (QualifyingEventBase & { event: "qualifying.front_row"; data: QualifyingFrontRowData })
  | (QualifyingEventBase & { event: string; data: Record<string, unknown> });

// ===========================================================================
// Generic envelope + feed id catalog
// ===========================================================================

/**
 * The canonical set of RaceHooks feed ids (the `feedId` you pass to
 * `webhooks.create`, and the `feed` discriminator on delivered payloads).
 * Mirrors the server feed registry.
 */
export type FeedId =
  | "session.status"
  | "session.track-status"
  | "weather.data"
  | "session.lap-count"
  | "driver.list"
  | "timing.data"
  | "timing.stats"
  | "timing.lap-history"
  | "timing.driver-info"
  | "tire.current"
  | "tire.history"
  | "tire.stints"
  | "pit.lane-times"
  | "pit.stops"
  | "pit.stop-series"
  | "session.clock"
  | "weather.data-series"
  | "race-control.messages"
  | "session.info"
  | "telemetry.position"
  | "telemetry.car-data"
  | "telemetry.driver-tracker"
  | "telemetry.track-position"
  | "standings.projection"
  | "results.classification"
  | "timing.top-three"
  | "timing.mini-sectors"
  | "events.race"
  | "session.timing"
  | "events.qualifying"
  | "results.race-summary"
  | "analytics.strategy"
  | "analytics.race-odds"
  | "analytics.true-pace"
  | "analytics.gap-projection"
  | "analytics.winning-margin"
  | "analytics.race-preview"
  | "analytics.race-duration"
  | "analytics.tire-strategy"
  | "analytics.team-points"
  | "analytics.championship-probability"
  | "analytics.qualifying"
  | "analytics.sector-pace"
  | "analytics.battle"
  | "analytics.pit-window"
  | "analytics.track-conditions"
  | "analytics.pit-quality"
  | "weather.rain-onset"
  | "weather.rain-cleared"
  | "weather.strategy-divergence"
  | "weather.compound-crossover"
  | "weather.forecast-update"
  | "weather.tire-mismatch";

/**
 * Generic webhook payload envelope. Every delivery is
 * `{ feed, sessionId, utc, <body> }`; the body is `data` for object payloads or
 * `drivers` for per-driver normalized feeds (timing.data, analytics.strategy, …).
 *
 * Use this as the loose fallback shape; narrow to a concrete payload type
 * (e.g. {@link RaceEventPayload}, {@link StrategyPayload}) by checking `feed`.
 */
export interface WebhookPayload<T = unknown> {
  feed: string;
  sessionId: string | null;
  /** ISO-8601 timestamp; present on standardized feeds. */
  utc?: string;
  /** Present for session-wide feeds (object payloads). */
  data?: T;
  /** Present for per-driver normalized feeds. */
  drivers?: (DriverRef & { [key: string]: unknown })[];
  /** Present only on Simulate (historical replay) deliveries. */
  _replay?: ReplayMeta;
}

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
