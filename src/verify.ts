import { createHmac, timingSafeEqual } from "crypto";

/** Header carrying the HMAC-SHA256 signature on every signed RaceHooks delivery. */
export const SIGNATURE_HEADER = "x-racehooks-signature";

/** Header carrying the send time (epoch milliseconds, as a string) for replay protection. */
export const TIMESTAMP_HEADER = "x-racehooks-sent-at";

/** Raised when webhook signature verification fails (invalid, missing, or malformed). */
export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

/** Raised when a delivery is older than the configured `toleranceSeconds` window. */
export class WebhookTimestampError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookTimestampError";
  }
}

/**
 * Compute the HMAC-SHA256 signature for a raw body, in the exact server format.
 *
 * @returns `"sha256=<hex>"` — matches the `X-RaceHooks-Signature` header format.
 *
 * @example
 * ```ts
 * // Useful in test helpers to generate a valid signature:
 * const sig = signPayload(process.env.WEBHOOK_SECRET!, rawBody);
 * ```
 */
export function signPayload(secret: string, body: string | Buffer): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

/** @internal Normalize a string | string[] | undefined header to a single string. */
function headerValue(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

/** @internal Constant-time HMAC comparison; returns false (never throws) on mismatch. */
function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface VerifyOptions {
  /** Send-time header value (epoch ms string or number) for replay protection. */
  timestamp?: string | number;
  /** Override the instance-level tolerance for this call. */
  toleranceSeconds?: number;
}

/**
 * Verify a RaceHooks HMAC-SHA256 webhook signature.
 *
 * Throws a typed error on failure; returns `true` on success (Stripe-style).
 *
 * @param payload   - Raw request body (Buffer or UTF-8 string) — NOT a parsed object.
 * @param signature - Value of the `X-RaceHooks-Signature` header (accepts array header too).
 * @param secret    - Webhook signing secret returned at webhook creation time.
 * @param options   - Optional replay-protection settings.
 * @throws {@link WebhookSignatureError} if the signature is missing or invalid.
 * @throws {@link WebhookTimestampError} if a tolerance is set and the delivery is too old.
 *
 * @example
 * ```ts
 * import { verifySignature } from "racehooks";
 * import type { IncomingMessage, ServerResponse } from "http";
 *
 * function handler(req: IncomingMessage, res: ServerResponse) {
 *   const chunks: Buffer[] = [];
 *   req.on("data", (c: Buffer) => chunks.push(c));
 *   req.on("end", () => {
 *     const body = Buffer.concat(chunks);
 *     const sig = req.headers["x-racehooks-signature"] as string;
 *     verifySignature(body, sig, process.env.WEBHOOK_SECRET!);
 *     const payload = JSON.parse(body.toString());
 *     // handle payload ...
 *   });
 * }
 * ```
 */
export function verifySignature(
  payload: string | Buffer,
  signature: string | string[] | undefined,
  secret: string,
  options: VerifyOptions = {},
): true {
  if (!secret) throw new WebhookSignatureError("No webhook secret provided");

  const sig = headerValue(signature).trim();
  if (!sig) throw new WebhookSignatureError("Missing signature header");
  if (!sig.startsWith("sha256=")) {
    throw new WebhookSignatureError("Unexpected signature format (expected 'sha256=' prefix)");
  }

  const expected = signPayload(secret, payload);
  if (!secureCompare(sig, expected)) {
    throw new WebhookSignatureError("Signature mismatch — payload may be tampered or secret is wrong");
  }

  const tolerance = options.toleranceSeconds;
  if (tolerance && tolerance > 0) {
    const tsRaw = options.timestamp;
    if (tsRaw === undefined || tsRaw === "") {
      throw new WebhookTimestampError("Timestamp required for replay protection but none provided");
    }
    const sentAtMs = typeof tsRaw === "number" ? tsRaw : parseInt(String(tsRaw), 10);
    if (Number.isNaN(sentAtMs)) throw new WebhookTimestampError("Invalid timestamp header");
    const ageSeconds = (Date.now() - sentAtMs) / 1000;
    if (ageSeconds > tolerance) {
      throw new WebhookTimestampError(
        `Delivery is ${Math.round(ageSeconds)}s old (tolerance ${tolerance}s)`,
      );
    }
  }

  return true;
}

/**
 * Non-throwing wrapper around {@link verifySignature}.
 *
 * @returns `true` on success, `false` on any verification failure.
 *
 * @example
 * ```ts
 * if (!verifySignatureBoolean(body, sig, secret)) {
 *   res.writeHead(401).end("Bad signature");
 *   return;
 * }
 * ```
 */
export function verifySignatureBoolean(
  payload: string | Buffer,
  signature: string | string[] | undefined,
  secret: string,
  options: VerifyOptions = {},
): boolean {
  try {
    verifySignature(payload, signature, secret, options);
    return true;
  } catch {
    return false;
  }
}
