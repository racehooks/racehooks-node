export { RaceHooks } from "./client.js";
export {
  verifySignature,
  verifySignatureBoolean,
  signPayload,
  WebhookSignatureError,
  WebhookTimestampError,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
} from "./verify.js";
export {
  constructEvent,
  safeConstructEvent,
  webhookHandler,
} from "./webhook-middleware.js";
export { RaceHooksAuthError, RaceHooksAPIError } from "./auth.js";

export type {
  RaceHooksConfig,
  SubscriptionTier,
  Webhook,
  WebhookFilters,
  Feed,
  DeliveryLog,
  Simulation,
  SubscriptionData,
  UsageByFeedEntry,
  Event,
  EventSession,
  LiveContext,
  LiveDriverRow,
  WebhookPayload,
  RaceEventPayload,
  RaceEventType,
  CreateWebhookOptions,
  CreateWebhookResult,
  PaginatedResult,
  // Analytics shared sub-types
  DriverRef,
  TireHealthSnapshot,
  LTOESnapshot,
  UndercutThreatSnapshot,
  CliffRisk,
  DegMode,
  HealthLabel,
  PaceMode,
  // analytics.strategy
  AnalyticsStrategyDriver,
  AnalyticsStrategyPayload,
  // analytics.race-odds
  AnalyticsRaceOddsDriver,
  ConstructorH2HPair,
  AnalyticsRaceOddsPayload,
  // analytics.gap-projection
  AnalyticsGapProjectionDriver,
  AnalyticsGapProjectionPayload,
  // analytics.tire-strategy
  AnalyticsTireStrategyDriver,
  AnalyticsTireStrategyPayload,
  // analytics.constructor
  AnalyticsConstructorRow,
  AnalyticsConstructorPayload,
  // analytics.championship-probability
  AnalyticsChampionshipDriver,
  AnalyticsChampionshipProbabilityPayload,
  // analytics.qualifying
  AnalyticsQualifyingSectors,
  AnalyticsQualifyingDriver,
  AnalyticsQualifyingPayload,
  // analytics.sector-pace
  SectorAnomalyCause,
  SectorAnomalyLevel,
  SectorPaceReading,
  SectorPaceSnapshot,
  AnalyticsSectorPacePayload,
  // analytics.battle
  BattleStatus,
  BattleState,
  AnalyticsBattlePayload,
  // analytics.pit-window
  PitWindowStatus,
  PitWindowAlert,
  AnalyticsPitWindowPayload,
  // analytics.track-conditions
  SectorCondition,
  SectorConditions,
  AnalyticsTrackConditionsPayload,
  // analytics.pit-quality
  PitQuality,
  PitQualityAlert,
  AnalyticsPitQualityPayload,
  // weather.rain_onset / weather.rain_cleared
  WeatherEventType,
  WeatherEvent,
  WeatherRainEventPayload,
  // weather.forecast_update
  WeatherForecastSlot,
  WeatherForecastUpdatePayload,
  // weather.tyre_mismatch
  TyreMismatchSeverity,
  TyreMismatchTrigger,
  WeatherTyreMismatchPayload,
  // weather.strategy_divergence
  WeatherCompoundGroup,
  WeatherStrategyDivergencePayload,
  // weather.compound_crossover_alert
  CompoundCrossoverDriver,
  WeatherCompoundCrossoverPayload,
  // Data API types
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
  // Insights types
  InsightRace,
  LapAnalyticsEntry,
  InsightBundle,
  ModelMetaEntry,
  // Telemetry types
  LapTelemetryEntry,
  TelemetrySummary,
  // Fantasy types
  PitTimeStop,
  FantasyScoreEntry,
  // Billing types
  BillingPlan,
  TierConfig,
} from "./types.js";

export type {
  VerifyOptions,
  SafeConstructEventResult,
  WebhookEventHandler,
  NodeLikeRequest,
  NodeLikeResponse,
} from "./webhook-middleware.js";

export type { StartSimulationOptions } from "./simulate.js";
export type { UsageHistory, LatencyByFeedEntry } from "./usage.js";
