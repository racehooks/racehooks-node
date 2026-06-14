// ---------------------------------------------------------------------------
// Shared types mirroring the RaceHooks API response shapes
// ---------------------------------------------------------------------------

export type SubscriptionTier = "free" | "live" | "analytics";

export interface WebhookFilters {
  drivers?: string[];
  driverNumbers?: string[];
  driverIds?: string[];
  constructors?: string[];
  positions?: { min?: number; max?: number };
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
    analyticsEnrichment: boolean;
  };
  usage: {
    period: string;
    webhookCount: number;
    webhooksRemaining: number;
    dailyDeliveries: number;
    dailyRemaining: number | null;
    failureCount: number;
  };
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
// Analytics sub-types (Analytics tier — present when `analyticsEnrichment` is true)
// ---------------------------------------------------------------------------

export type CliffRisk = "NONE" | "GRAINING" | "THERMAL" | "BLISTERING_RISK" | "BLISTERING";
export type DegMode = "WARM_UP" | "STABLE" | "DEGRADING" | "CLIFF";
export type HealthLabel = "GOOD" | "MODERATE" | "LOW" | "CRITICAL";

/** Full tyre-degradation snapshot delivered per driver in `timingdata` payloads. */
export interface TireHealthSnapshot {
  /** 0.0–1.0 (1.0 = fresh, 0.0 = fully spent performance budget). */
  tireHealth: number;
  /** 0–100 display value (tireHealth × 100, rounded). */
  tireHealthPct: number;
  /** Kalman-filtered degradation rate in seconds per lap (positive = degrading). */
  degRateSecPerLap: number;
  /** Estimated race lap at which the performance cliff occurs; null during warm-up. */
  cliffLapPredicted: number | null;
  /** cliffLapPredicted − currentRaceLap; falls back to compoundMaxLaps − tyreLife. */
  remainingUsefulLife: number;
  /** Qualitative cliff-risk classification. */
  cliffRisk: CliffRisk;
  /** Total fuel-corrected time lost this stint (seconds). */
  cumulativeDegSec: number;
  /** Number of laps on this set. */
  stintLaps: number;
  /** 95% confidence-interval lower bound on tireHealth. */
  confidenceLow: number;
  /** 95% confidence-interval upper bound on tireHealth. */
  confidenceHigh: number;
  /** Active degradation mode. */
  degModeActive: DegMode;
  /** Human-readable tyre-health label. */
  healthLabel: HealthLabel;
}

/** Win/podium probability snapshot delivered per driver in `timingdata` payloads. */
export interface WinProbabilitySnapshot {
  driverNumber: string;
  /** P(finish P1), 0.0–1.0. */
  winProbability: number;
  /** P(finish P1–P3), 0.0–1.0. */
  podiumProbability: number;
  /** Expected Championship Points this race. */
  ecp: number;
  /** ECP delta from the previous lap. */
  ecpa: number;
  /** P(finish at each position), 1-indexed (index 0 unused). */
  positionDistribution: number[];
}

/** Lap-Time Over Expectation snapshot (LTOE) — present when model confidence is sufficient. */
export interface LTOESnapshot {
  /** Actual − expected fuel-corrected lap time (negative = driver faster than context). */
  ltoeSec: number;
  /** Model-predicted fuel-corrected lap time for this lap. */
  expectedLapTimeSec: number;
  /** Driver's actual fuel-corrected lap time. */
  actualLapTimeSec: number;
  /** Calibration scale factor; < 1.0 indicates reduced confidence (e.g. early 2026 era). */
  confidenceScale: number;
}

/** Undercut threat assessment delivered per driver in `timingdata` payloads. */
export interface UndercutThreatSnapshot {
  /** Composite undercut threat score (0–1). */
  score: number;
  /** Whether an undercut is strategically viable for this driver. */
  viable: boolean;
  /** Current gap to the car directly ahead (seconds). */
  gapToCarAheadSec: number;
  /** Estimated net time delta from executing an undercut (seconds; negative = gain). */
  estimatedDeltaSec: number;
}

/**
 * Analytics block included inline per-driver in `timingdata` payloads
 * (Analytics tier subscribers only).
 */
export interface DriverAnalytics {
  /** Regulations era — `"2026"` or `"pre-2026"`. */
  regulationsEra?: string;
  /** Full tyre-degradation model output. */
  tireHealth?: TireHealthSnapshot;
  /** Pit-stop probability from the BiLSTM model, 0.0–1.0. */
  pitStopProbability?: number;
  /** True when pitStopProbability exceeds the era-calibrated threshold. */
  pitRecommended?: boolean;
  /** Safety-car deployment probability for the next lap, 0.0–1.0. */
  safetyCarProbability?: number;
  /** Overtake success probability for a detected overtake attempt, 0.0–1.0. */
  overtakeProbability?: number;
  /** Win/podium probability from the CTMC model. */
  winProbability?: WinProbabilitySnapshot;
  /** Undercut threat assessment relative to the car ahead. */
  undercutThreat?: UndercutThreatSnapshot;
  /** Lap-Time Over Expectation model output. */
  ltoe?: LTOESnapshot;
  /** LTOE confidence qualifier — `"stable"` after 8+ 2026 races; `"2026_early"` before. */
  ltoeConfidenceFlag?: "2026_early" | "stable";
}

// Webhook payload envelope delivered to your endpoint.
// Normalized per-driver feeds (timingdata, etc.) use `drivers` instead of `data`.
export interface WebhookPayload<T = unknown> {
  feed: string;
  sessionId: string | null;
  /** Present for session-wide feeds and raceevent. */
  data?: T;
  /** Present for per-driver normalized feeds (timingdata, etc.). */
  drivers?: (DriverRef & { analytics?: DriverAnalytics; [key: string]: unknown })[];
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
