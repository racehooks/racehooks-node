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
} from "./types.js";

export type {
  VerifyOptions,
  SafeConstructEventResult,
  WebhookEventHandler,
  NodeLikeRequest,
  NodeLikeResponse,
} from "./webhook-middleware.js";

export type { StartSimulationOptions } from "./simulate.js";
export type { UsageHistory } from "./usage.js";
