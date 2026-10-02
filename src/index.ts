export { RaceHooks } from "./client.js";
export {
  verifySignature,
  verifySignatureBoolean,
  signPayload,
  signPayloadV1,
  WebhookSignatureError,
  WebhookTimestampError,
  SIGNATURE_HEADER,
  SIGNATURE_V1_HEADER,
  TIMESTAMP_HEADER,
} from "./verify.js";
export {
  constructEvent,
  safeConstructEvent,
  webhookHandler,
} from "./webhook-middleware.js";
export { RaceHooksAuthError, RaceHooksAPIError } from "./auth.js";
export type { UpdateWebhookPatch } from "./webhooks.js";

// Re-export every payload/REST/data type from ./types. types.ts is the single
// source of the public type surface — a wildcard keeps this in lockstep with it
// (the previous hand-maintained allowlist drifted from the feed contracts).
export type * from "./types.js";

export type {
  VerifyOptions,
  SafeConstructEventResult,
  WebhookEventHandler,
  NodeLikeRequest,
  NodeLikeResponse,
} from "./webhook-middleware.js";

export type { StartSimulationOptions } from "./simulate.js";
export type { UsageHistory, LatencyByFeedEntry } from "./usage.js";
