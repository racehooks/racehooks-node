/**
 * Webhook construction helpers and Express/Fastify/plain-http middleware.
 *
 * These are the high-level, Stripe-style building blocks. The lower-level
 * `verifySignature` function is in `verify.ts` if you need raw access.
 */

import {
  verifySignature,
  headerValue,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  WebhookSignatureError,
  WebhookTimestampError,
} from "./verify.js";
import type { VerifyOptions } from "./verify.js";
import type { WebhookPayload } from "./types.js";

export type { VerifyOptions };

/** Result type returned by `safeConstructEvent`. */
export type SafeConstructEventResult =
  | { valid: true; event: WebhookPayload }
  | { valid: false; error: WebhookSignatureError | WebhookTimestampError | Error };

/** Callback invoked by `webhookHandler` with the verified, parsed event. */
export type WebhookEventHandler = (event: WebhookPayload) => void | Promise<void>;

/** A minimal Node http-like request shape (also satisfied by Express/Fastify). */
export interface NodeLikeRequest {
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  rawBody?: string | Buffer;
  on?(event: string, cb: (chunk: unknown) => void): void;
}

/** A minimal Node http-like response shape (also satisfied by Express/Fastify). */
export interface NodeLikeResponse {
  statusCode?: number;
  status?(code: number): NodeLikeResponse;
  setHeader?(name: string, value: string): void;
  end(body?: string): void;
  send?(body?: string): void;
  json?(body: unknown): void;
}

/**
 * Verify the raw webhook payload and parse it into a typed event object.
 *
 * @param payload   - Raw request body (Buffer or string) — NOT a parsed object.
 * @param signature - Value of the `X-RaceHooks-Signature` header.
 * @param secret    - Webhook signing secret from webhook creation.
 * @param options   - Optional timestamp + toleranceSeconds for replay protection.
 * @throws {@link WebhookSignatureError} on invalid/missing signature.
 * @throws {@link WebhookTimestampError} if the delivery is too old.
 *
 * @example
 * ```ts
 * import { constructEvent } from "racehooks";
 *
 * // Express (using express.raw({ type: "application/json" })):
 * app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
 *   const event = constructEvent(req.body, req.headers["x-racehooks-signature"], secret);
 *   if (event.type === "raceevent") { ... }
 *   res.json({ received: true });
 * });
 * ```
 */
export function constructEvent(
  payload: string | Buffer,
  signature: string | string[] | undefined,
  secret: string,
  options: VerifyOptions = {},
): WebhookPayload {
  verifySignature(payload, signature, secret, options);
  const text = typeof payload === "string" ? payload : payload.toString("utf8");
  return JSON.parse(text) as WebhookPayload;
}

/**
 * Non-throwing variant of {@link constructEvent}.
 *
 * Returns `{ valid: true, event }` on success or `{ valid: false, error }` on failure.
 *
 * @example
 * ```ts
 * const result = safeConstructEvent(rawBody, sig, secret);
 * if (!result.valid) {
 *   console.warn("Bad delivery:", result.error.message);
 *   return res.status(400).json({ error: result.error.message });
 * }
 * console.log("Received:", result.event.type);
 * ```
 */
export function safeConstructEvent(
  payload: string | Buffer,
  signature: string | string[] | undefined,
  secret: string,
  options: VerifyOptions = {},
): SafeConstructEventResult {
  try {
    return { valid: true, event: constructEvent(payload, signature, secret, options) };
  } catch (error) {
    return { valid: false, error: error as Error };
  }
}

/**
 * Build an Express/Fastify/connect-style middleware that verifies the signature,
 * parses the event, calls your handler, and replies 200 (or 400 on failure).
 *
 * Requires access to the **raw** request body. Either:
 *  - Mount `express.raw({ type: "application/json" })` before this so `req.body`
 *    is a `Buffer`, **or**
 *  - Expose `req.rawBody` (via a body-parser `verify` callback), **or**
 *  - Use plain `http.IncomingMessage` — the middleware will read the stream itself.
 *
 * @param secret    - Webhook signing secret.
 * @param handler   - Your event handler function.
 * @param options   - Optional default replay-protection settings.
 *
 * @example
 * ```ts
 * // Express
 * app.post(
 *   "/webhook",
 *   express.raw({ type: "application/json" }),
 *   webhookHandler(process.env.WEBHOOK_SECRET!, async (event) => {
 *     if (event.type === "raceevent") { ... }
 *   }),
 * );
 *
 * // Fastify
 * fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => done(null, body));
 * fastify.post("/webhook", webhookHandler(secret, handler));
 * ```
 */
export function webhookHandler(
  secret: string,
  handler: WebhookEventHandler,
  options: VerifyOptions = {},
): (req: NodeLikeRequest, res: NodeLikeResponse) => Promise<void> {
  return async (req: NodeLikeRequest, res: NodeLikeResponse): Promise<void> => {
    let raw: string | Buffer;
    try {
      raw = await resolveRawBody(req);
    } catch (err) {
      replyJson(res, 400, { error: `Could not read request body: ${(err as Error).message}` });
      return;
    }

    const signature = req.headers[SIGNATURE_HEADER];
    const timestamp = headerValue(req.headers[TIMESTAMP_HEADER]);
    const callOptions: VerifyOptions = { ...options };
    if (timestamp) callOptions.timestamp = timestamp;

    let event: WebhookPayload;
    try {
      event = constructEvent(raw, signature, secret, callOptions);
    } catch (err) {
      replyJson(res, 400, { error: (err as Error).message });
      return;
    }

    try {
      await handler(event);
    } catch (err) {
      replyJson(res, 500, { error: `Webhook handler error: ${(err as Error).message}` });
      return;
    }

    replyJson(res, 200, { received: true });
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function resolveRawBody(req: NodeLikeRequest): Promise<string | Buffer> {
  // Accept rawBody only when it contains actual bytes (non-empty string or non-empty Buffer).
  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) return req.rawBody;
  if (typeof req.rawBody === "string" && req.rawBody.length > 0) return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
    throw new Error(
      "Request body was already parsed to an object. " +
      "Mount express.raw({ type: 'application/json' }) before this middleware, " +
      "or expose req.rawBody so the SDK can verify the original bytes.",
    );
  }
  if (typeof req.body === "string") return req.body;
  if (typeof req.on === "function") return readStream(req);
  throw new Error("No readable body found on request");
}

function readStream(req: NodeLikeRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const on = req.on!;
    on.call(req, "data", (chunk: unknown) => chunks.push(Buffer.from(chunk as Buffer)));
    on.call(req, "end", () => resolve(Buffer.concat(chunks)));
    on.call(req, "error", (err: unknown) => reject(err as Error));
  });
}

function replyJson(res: NodeLikeResponse, code: number, body: unknown): void {
  const json = res.json;
  const status = res.status;
  // Express path: res.status(code).json(body)
  if (typeof status === "function" && typeof json === "function") {
    status.call(res, code);
    json.call(res, body);
    return;
  }
  // Plain http.ServerResponse path
  res.statusCode = code;
  res.setHeader?.("content-type", "application/json");
  res.end(JSON.stringify(body));
}
