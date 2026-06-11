import { TokenManager } from "./auth.js";
import { HttpClient } from "./http.js";
import { WebhooksNamespace } from "./webhooks.js";
import { FeedsNamespace } from "./feeds.js";
import { SimulateNamespace } from "./simulate.js";
import { EventsNamespace, LiveNamespace } from "./events.js";
import { UsageNamespace } from "./usage.js";
import type { RaceHooksConfig } from "./types.js";
import {
  constructEvent,
  safeConstructEvent,
  webhookHandler,
} from "./webhook-middleware.js";
import type {
  VerifyOptions,
  SafeConstructEventResult,
  WebhookEventHandler,
  NodeLikeRequest,
  NodeLikeResponse,
} from "./webhook-middleware.js";
import {
  WebhookSignatureError,
  WebhookTimestampError,
} from "./verify.js";
import type { WebhookPayload } from "./types.js";

export const DEFAULT_BASE_URL = "https://api.racehooks-ai.com";
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * RaceHooks client — the entry point for all SDK operations.
 *
 * Pass `secret` (from your webhook creation response) to enable the
 * Stripe-style webhook verification helpers: `constructEvent`,
 * `safeConstructEvent`, and `webhookHandler`.
 *
 * @example
 * ```ts
 * import { RaceHooks } from "racehooks";
 *
 * const rh = new RaceHooks({
 *   clientId:     process.env.RACEHOOKS_CLIENT_ID!,
 *   clientSecret: process.env.RACEHOOKS_CLIENT_SECRET!,
 *   secret:       process.env.RACEHOOKS_WEBHOOK_SECRET!,
 *   toleranceSeconds: 300,
 * });
 *
 * // Subscribe to race events for Ferrari only
 * const { webhook } = await rh.webhooks.create({
 *   feedId:     "raceevent",
 *   webhookUrl: "https://yourserver.com/hook",
 *   filters:    { constructors: ["ferrari"] },
 * });
 *
 * // In your webhook endpoint:
 * app.post("/hook", express.raw({ type: "application/json" }), (req, res) => {
 *   const event = rh.constructEvent(req.body, req.headers["x-racehooks-signature"]);
 *   if (event.feed === "raceevent") { ... }
 *   res.json({ received: true });
 * });
 * ```
 */
export class RaceHooks {
  readonly webhooks: WebhooksNamespace;
  readonly feeds: FeedsNamespace;
  readonly simulate: SimulateNamespace;
  readonly events: EventsNamespace;
  readonly live: LiveNamespace;
  readonly usage: UsageNamespace;

  private readonly http: HttpClient;
  private readonly _secret?: string;
  private readonly _toleranceSeconds: number;

  constructor(config: RaceHooksConfig) {
    const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const tokens = new TokenManager(config.clientId, config.clientSecret, baseUrl, timeoutMs);
    this.http = new HttpClient(tokens, baseUrl, timeoutMs);

    this.webhooks = new WebhooksNamespace(this.http);
    this.feeds    = new FeedsNamespace(this.http);
    this.simulate = new SimulateNamespace(this.http);
    this.events   = new EventsNamespace(this.http);
    this.live     = new LiveNamespace(this.http);
    this.usage    = new UsageNamespace(this.http);

    this._secret = config.secret;
    this._toleranceSeconds = config.toleranceSeconds ?? 0;
  }

  /**
   * Verify the raw webhook payload and parse it into a typed event.
   *
   * Requires `secret` to have been passed to the constructor.
   *
   * @throws {@link WebhookSignatureError} on invalid/missing signature.
   * @throws {@link WebhookTimestampError} if the delivery is too old.
   */
  constructEvent(
    payload: string | Buffer,
    signature: string | string[] | undefined,
    options: VerifyOptions = {},
  ): WebhookPayload {
    if (!this._secret) {
      throw new WebhookSignatureError(
        "RaceHooks instance was not created with a `secret`. " +
        "Pass `secret` in the constructor options to enable webhook verification.",
      );
    }
    return constructEvent(payload, signature, this._secret, {
      toleranceSeconds: this._toleranceSeconds,
      ...options,
    });
  }

  /**
   * Non-throwing variant of {@link constructEvent}.
   * Returns `{ valid: false, error }` instead of throwing.
   */
  safeConstructEvent(
    payload: string | Buffer,
    signature: string | string[] | undefined,
    options: VerifyOptions = {},
  ): SafeConstructEventResult {
    try {
      return { valid: true, event: this.constructEvent(payload, signature, options) };
    } catch (error) {
      return { valid: false, error: error as Error };
    }
  }

  /**
   * Build an Express/Fastify/connect-style middleware that verifies the signature,
   * parses the event, calls your handler, and replies 200 (or 400 on failure).
   *
   * Requires `secret` to have been passed to the constructor.
   *
   * @example
   * ```ts
   * app.post(
   *   "/webhook",
   *   express.raw({ type: "application/json" }),
   *   rh.webhookHandler(async (event) => {
   *     if (event.feed === "raceevent") { ... }
   *   }),
   * );
   * ```
   */
  webhookHandler(
    handler: WebhookEventHandler,
    options: VerifyOptions = {},
  ): (req: NodeLikeRequest, res: NodeLikeResponse) => Promise<void> {
    if (!this._secret) {
      throw new WebhookSignatureError(
        "RaceHooks instance was not created with a `secret`. " +
        "Pass `secret` in the constructor options to enable webhook verification.",
      );
    }
    return webhookHandler(this._secret, handler, {
      toleranceSeconds: this._toleranceSeconds,
      ...options,
    });
  }
}
