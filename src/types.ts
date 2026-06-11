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

/** Analytics block included inline per-driver in normalized feeds. */
export interface DriverAnalytics {
  tireHealth?: number;
  degRateSecPerLap?: number;
  cliffLapPredicted?: number;
  cliffRisk?: "low" | "medium" | "high" | "critical";
  pitStopProbability?: number;
  pitRecommended?: boolean;
  safetyCarProbability?: number;
  fuelCorrectedTimeSec?: number;
  regulationsEra?: string;
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
