import { createHmac, timingSafeEqual } from "crypto";

/**
 * Header carrying the legacy body-only signature (`sha256=<hex>`) on every signed
 * RaceHooks delivery. It proves origin and integrity, but covers no header — so it
 * says nothing about WHEN the delivery was sent.
 */
export const SIGNATURE_HEADER = "x-racehooks-signature";

/**
 * Header carrying the timestamped signature `t=<sentAtMs>,v1=<hex>`, where hex is
 * HMAC-SHA256(secret, `${t}.${rawBody}`). Because `t` is signed, a tolerance window
 * checked against it is real replay protection. Prefer this header when present.
 */
export const SIGNATURE_V1_HEADER = "x-racehooks-signature-v1";

/**
 * Header carrying the send time of this attempt (epoch milliseconds, as a string).
 * NOT covered by the legacy signature — anyone holding a captured delivery can resend
 * it with a fresh value. The signed equivalent is the `t=` in {@link SIGNATURE_V1_HEADER}.
 */
export const TIMESTAMP_HEADER = "x-racehooks-sent-at";

/** Raised when webhook signature verification fails (invalid, missing, or malformed). */
export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

/** Raised when a delivery falls outside the configured `toleranceSeconds` window. */
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

/**
 * Compute the timestamped (v1) signature in the exact server format:
 * `t=<sentAtMs>,v1=<hex HMAC-SHA256 of "${t}.${body}">` — the value of the
 * `X-RaceHooks-Signature-V1` header.
 *
 * @example
 * ```ts
 * // Test helper: sign a body as if it were sent now.
 * const sigV1 = signPayloadV1(process.env.WEBHOOK_SECRET!, rawBody, Date.now());
 * ```
 */
export function signPayloadV1(secret: string, body: string | Buffer, sentAtMs: number): string {
  const t = String(sentAtMs);
  const hex = createHmac("sha256", secret).update(`${t}.`).update(body).digest("hex");
  return `t=${t},v1=${hex}`;
}

/** @internal Normalize a string | string[] | undefined header to a single string. */
export function headerValue(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

/** @internal Constant-time HMAC comparison; returns false (never throws) on mismatch. */
function secureCompare(a: string, b: string): boolean {
  // Always run timingSafeEqual on equal-length buffers. When lengths differ, compare
  // against 'b' padded to 'a' length so the comparison takes constant time regardless
  // of whether the supplied signature is the right length.
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still consume constant time relative to bufB by running the comparison anyway.
    const padded = Buffer.alloc(bufA.length);
    bufB.copy(padded, 0, 0, Math.min(bufB.length, bufA.length));
    timingSafeEqual(bufA, padded);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export interface VerifyOptions {
  /**
   * Value of the `X-RaceHooks-Signature-V1` header (`t=<ms>,v1=<hex>`). When present it is
   * verified INSTEAD of the legacy body-only signature, and `toleranceSeconds` is checked
   * against its signed `t` (real replay protection). `webhookHandler` reads it for you.
   */
  signatureV1?: string | string[];
  /**
   * Require the v1 signature: reject a delivery that carries only the legacy body-only
   * signature (blocks downgrade by stripping the v1 header). Default `false`.
   */
  requireV1?: boolean;
  /**
   * Value of `X-RaceHooks-Sent-At` (epoch ms). Used only on the legacy fallback path
   * (no v1 signature), where it is unsigned — a staleness hint, not replay protection.
   */
  timestamp?: string | number;
  /**
   * Maximum allowed age (and clock-skew lead) of a delivery, in seconds; `0` / omitted
   * disables the check. With a v1 signature this is checked against the SIGNED send time
   * and is replay protection. Without one it falls back to the unsigned
   * `X-RaceHooks-Sent-At` and is only a staleness hint — dedupe on
   * `X-RaceHooks-Delivery-Id` for replay safety in that case. Overrides the
   * instance-level tolerance for this call.
   */
  toleranceSeconds?: number;
}

/** @internal Parse `t=<ms>,v1=<hex>[,v1=<hex>...]`. */
function parseV1Header(header: string): { t: string; signatures: string[] } {
  let t = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") t = value;
    else if (key === "v1" && value) signatures.push(value);
  }
  return { t, signatures };
}

/** @internal Enforce a tolerance window around a send time (epoch ms). */
function checkTolerance(sentAtMs: number, tolerance: number, signed: boolean): void {
  const ageSeconds = (Date.now() - sentAtMs) / 1000;
  if (ageSeconds > tolerance) {
    throw new WebhookTimestampError(
      `Delivery is ${Math.round(ageSeconds)}s old (tolerance ${tolerance}s)`,
    );
  }
  if (signed && -ageSeconds > tolerance) {
    throw new WebhookTimestampError(
      `Delivery is timestamped ${Math.round(-ageSeconds)}s in the future (tolerance ${tolerance}s)`,
    );
  }
}

/** @internal Verify the timestamped v1 signature and its signed send time. */
function verifyV1(payload: string | Buffer, header: string, secret: string, tolerance: number | undefined): void {
  const { t, signatures } = parseV1Header(header);
  if (!/^\d+$/.test(t) || signatures.length === 0) {
    throw new WebhookSignatureError("Unexpected v1 signature format (expected 't=<ms>,v1=<hex>')");
  }
  const expected = signPayloadV1(secret, payload, Number(t)).slice(`t=${t},v1=`.length);
  // Check every candidate (no early exit) so timing doesn't reveal which one matched.
  let ok = false;
  for (const candidate of signatures) ok = secureCompare(candidate, expected) || ok;
  if (!ok) {
    throw new WebhookSignatureError("Signature mismatch — payload or timestamp tampered, or secret is wrong");
  }
  if (tolerance && tolerance > 0) checkTolerance(Number(t), tolerance, true);
}

/**
 * Verify a RaceHooks webhook signature.
 *
 * Two signatures ride on every signed delivery:
 *  - `X-RaceHooks-Signature-V1: t=<ms>,v1=<hex>` — HMAC of `${t}.${body}`. Verified when
 *    supplied (via `options.signatureV1`, or by passing it as `signature`); `toleranceSeconds`
 *    is then enforced on the signed `t`, which makes it replay protection.
 *  - `X-RaceHooks-Signature: sha256=<hex>` — legacy, body only. Used as a fallback when no
 *    v1 value is supplied (unless `requireV1`); `toleranceSeconds` then reads the unsigned
 *    `X-RaceHooks-Sent-At` and is only a staleness hint.
 *
 * Whatever the path, dedupe on `X-RaceHooks-Delivery-Id`: deliveries are at-least-once and
 * a retry is a legitimate re-send of the same id.
 *
 * Throws a typed error on failure; returns `true` on success.
 *
 * @param payload   - Raw request body (Buffer or UTF-8 string) — NOT a parsed object.
 * @param signature - Value of `X-RaceHooks-Signature` (or of `X-RaceHooks-Signature-V1`).
 * @param secret    - Webhook signing secret returned at webhook creation time.
 * @param options   - v1 signature, tolerance and fallback settings.
 * @throws {@link WebhookSignatureError} if the signature is missing or invalid.
 * @throws {@link WebhookTimestampError} if a tolerance is set and the send time is outside it.
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
 *     verifySignature(body, req.headers["x-racehooks-signature"], process.env.WEBHOOK_SECRET!, {
 *       signatureV1: req.headers["x-racehooks-signature-v1"],
 *       toleranceSeconds: 300, // enforced on the SIGNED send time
 *     });
 *     const payload = JSON.parse(body.toString());
 *     // dedupe on req.headers["x-racehooks-delivery-id"], then handle payload ...
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
  const v1 = headerValue(options.signatureV1).trim() || (sig.startsWith("t=") ? sig : "");
  const tolerance = options.toleranceSeconds;

  if (v1) {
    verifyV1(payload, v1, secret, tolerance);
    return true;
  }

  if (options.requireV1) {
    throw new WebhookSignatureError("Missing X-RaceHooks-Signature-V1 header (requireV1 is set)");
  }

  // ── Legacy fallback: body-only signature ─────────────────────────────────
  if (!sig) throw new WebhookSignatureError("Missing signature header");
  if (!sig.startsWith("sha256=")) {
    throw new WebhookSignatureError("Unexpected signature format (expected 'sha256=' prefix)");
  }

  const expected = signPayload(secret, payload);
  if (!secureCompare(sig, expected)) {
    throw new WebhookSignatureError("Signature mismatch — payload may be tampered or secret is wrong");
  }

  // Staleness hint only: X-RaceHooks-Sent-At is not covered by the legacy signature.
  if (tolerance && tolerance > 0) {
    const tsRaw = options.timestamp;
    if (tsRaw === undefined || tsRaw === "") {
      throw new WebhookTimestampError("Timestamp required for the tolerance check but none provided");
    }
    const sentAtMs = typeof tsRaw === "number" ? tsRaw : parseInt(String(tsRaw), 10);
    if (Number.isNaN(sentAtMs)) throw new WebhookTimestampError("Invalid timestamp header");
    checkTolerance(sentAtMs, tolerance, false);
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
 * if (!verifySignatureBoolean(body, sig, secret, { signatureV1: sigV1, toleranceSeconds: 300 })) {
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
