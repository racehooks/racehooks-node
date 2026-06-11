/**
 * Tests for RaceHooks webhook verification — signPayload, verifySignature,
 * verifySignatureBoolean, constructEvent, safeConstructEvent, webhookHandler.
 */

import { createHmac } from "crypto";
import {
  signPayload,
  verifySignature,
  verifySignatureBoolean,
  WebhookSignatureError,
  WebhookTimestampError,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
} from "../verify.js";
import {
  constructEvent,
  safeConstructEvent,
  webhookHandler,
} from "../webhook-middleware.js";
import type { NodeLikeRequest, NodeLikeResponse } from "../webhook-middleware.js";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const SECRET = "whsec_test_0123456789abcdef0123456789abcdef";

const WEATHER_BODY = JSON.stringify({
  feed: "weatherdata",
  sessionId: "2026-bahrain-r1",
  data: { AirTemp: "24.1", TrackTemp: "31.0", Rainfall: "0" },
});

const RACE_EVENT_BODY = JSON.stringify({
  feed: "raceevent",
  sessionId: "2026-bahrain-r1",
  event: "safety.car.deployed",
  lap: 12,
  utc: "2026-03-16T15:42:10.000Z",
  data: { type: "full" },
});

/** Reproduce server signing: sha256=HMAC_SHA256(secret, body).hex */
function serverSign(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

// ── signPayload ───────────────────────────────────────────────────────────────

describe("signPayload", () => {
  it("matches server signing format", () => {
    const result = signPayload(SECRET, WEATHER_BODY);
    expect(result).toBe(serverSign(SECRET, WEATHER_BODY));
  });

  it("starts with sha256=", () => {
    expect(signPayload(SECRET, WEATHER_BODY)).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("produces same result for string and Buffer input", () => {
    expect(signPayload(SECRET, WEATHER_BODY)).toBe(
      signPayload(SECRET, Buffer.from(WEATHER_BODY)),
    );
  });
});

// ── constants ─────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("SIGNATURE_HEADER is lowercase", () => {
    expect(SIGNATURE_HEADER).toBe("x-racehooks-signature");
  });
  it("TIMESTAMP_HEADER is lowercase", () => {
    expect(TIMESTAMP_HEADER).toBe("x-racehooks-sent-at");
  });
});

// ── verifySignature ───────────────────────────────────────────────────────────

describe("verifySignature", () => {
  it("returns true for a valid signature", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    expect(verifySignature(WEATHER_BODY, sig, SECRET)).toBe(true);
  });

  it("accepts Buffer payload", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    expect(verifySignature(Buffer.from(WEATHER_BODY), sig, SECRET)).toBe(true);
  });

  it("accepts an array header (takes first element)", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    expect(verifySignature(WEATHER_BODY, [sig, "other"], SECRET)).toBe(true);
  });

  it("throws WebhookSignatureError for tampered body", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    expect(() =>
      verifySignature(WEATHER_BODY.replace("24.1", "99.9"), sig, SECRET),
    ).toThrow(WebhookSignatureError);
  });

  it("throws WebhookSignatureError for wrong secret", () => {
    const sig = serverSign("wrong_secret", WEATHER_BODY);
    expect(() => verifySignature(WEATHER_BODY, sig, SECRET)).toThrow(WebhookSignatureError);
  });

  it("throws WebhookSignatureError when signature is missing", () => {
    expect(() => verifySignature(WEATHER_BODY, undefined, SECRET)).toThrow(WebhookSignatureError);
  });

  it("throws WebhookSignatureError for empty signature string", () => {
    expect(() => verifySignature(WEATHER_BODY, "", SECRET)).toThrow(WebhookSignatureError);
  });

  it("throws WebhookSignatureError for missing sha256= prefix", () => {
    expect(() =>
      verifySignature(WEATHER_BODY, "deadbeef", SECRET),
    ).toThrow(WebhookSignatureError);
  });

  it("throws WebhookSignatureError when secret is empty", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    expect(() => verifySignature(WEATHER_BODY, sig, "")).toThrow(WebhookSignatureError);
  });

  it("error has correct name", () => {
    try {
      verifySignature(WEATHER_BODY, "sha256=bad", SECRET);
    } catch (e) {
      expect((e as Error).name).toBe("WebhookSignatureError");
    }
  });
});

// ── replay protection ─────────────────────────────────────────────────────────

describe("verifySignature — replay protection", () => {
  it("accepts a fresh delivery within tolerance", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const nowMs = Date.now();
    expect(
      verifySignature(WEATHER_BODY, sig, SECRET, {
        timestamp: nowMs,
        toleranceSeconds: 300,
      }),
    ).toBe(true);
  });

  it("accepts string timestamp", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const nowMs = String(Date.now());
    expect(
      verifySignature(WEATHER_BODY, sig, SECRET, {
        timestamp: nowMs,
        toleranceSeconds: 300,
      }),
    ).toBe(true);
  });

  it("rejects a delivery older than tolerance", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const oldMs = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    expect(() =>
      verifySignature(WEATHER_BODY, sig, SECRET, {
        timestamp: oldMs,
        toleranceSeconds: 300,
      }),
    ).toThrow(WebhookTimestampError);
  });

  it("throws when timestamp is required but missing", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    expect(() =>
      verifySignature(WEATHER_BODY, sig, SECRET, { toleranceSeconds: 300 }),
    ).toThrow(WebhookTimestampError);
  });

  it("throws for invalid timestamp", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    expect(() =>
      verifySignature(WEATHER_BODY, sig, SECRET, {
        timestamp: "not-a-number",
        toleranceSeconds: 300,
      }),
    ).toThrow(WebhookTimestampError);
  });

  it("WebhookTimestampError has correct name", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    try {
      verifySignature(WEATHER_BODY, sig, SECRET, {
        timestamp: 0,
        toleranceSeconds: 300,
      });
    } catch (e) {
      expect((e as Error).name).toBe("WebhookTimestampError");
    }
  });
});

// ── verifySignatureBoolean ────────────────────────────────────────────────────

describe("verifySignatureBoolean", () => {
  it("returns true for valid signature", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    expect(verifySignatureBoolean(WEATHER_BODY, sig, SECRET)).toBe(true);
  });

  it("returns false for tampered body (no throw)", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    expect(
      verifySignatureBoolean(WEATHER_BODY.replace("24.1", "99.9"), sig, SECRET),
    ).toBe(false);
  });

  it("returns false for missing signature (no throw)", () => {
    expect(verifySignatureBoolean(WEATHER_BODY, undefined, SECRET)).toBe(false);
  });
});

// ── constructEvent ────────────────────────────────────────────────────────────

describe("constructEvent", () => {
  it("returns parsed event for valid signature", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const event = constructEvent(WEATHER_BODY, sig, SECRET);
    expect(event.feed).toBe("weatherdata");
    expect((event as { sessionId: string }).sessionId).toBe("2026-bahrain-r1");
  });

  it("works with Buffer payload", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const event = constructEvent(Buffer.from(WEATHER_BODY), sig, SECRET);
    expect(event.feed).toBe("weatherdata");
  });

  it("parses raceevent correctly", () => {
    const sig = serverSign(SECRET, RACE_EVENT_BODY);
    const event = constructEvent(RACE_EVENT_BODY, sig, SECRET) as unknown as Record<string, unknown>;
    expect(event["feed"]).toBe("raceevent");
    expect(event["event"]).toBe("safety.car.deployed");
    expect(event["lap"]).toBe(12);
  });

  it("throws WebhookSignatureError for bad signature", () => {
    expect(() =>
      constructEvent(WEATHER_BODY, "sha256=bad", SECRET),
    ).toThrow(WebhookSignatureError);
  });

  it("throws WebhookSignatureError for missing signature", () => {
    expect(() =>
      constructEvent(WEATHER_BODY, undefined, SECRET),
    ).toThrow(WebhookSignatureError);
  });
});

// ── safeConstructEvent ────────────────────────────────────────────────────────

describe("safeConstructEvent", () => {
  it("returns { valid: true, event } on success", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const result = safeConstructEvent(WEATHER_BODY, sig, SECRET);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.event.feed).toBe("weatherdata");
    }
  });

  it("returns { valid: false, error } on bad signature (no throw)", () => {
    const result = safeConstructEvent(WEATHER_BODY, "sha256=bad", SECRET);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeInstanceOf(WebhookSignatureError);
    }
  });

  it("returns { valid: false, error } for missing signature", () => {
    const result = safeConstructEvent(WEATHER_BODY, undefined, SECRET);
    expect(result.valid).toBe(false);
  });

  it("error object has message", () => {
    const result = safeConstructEvent(WEATHER_BODY, "sha256=bad", SECRET);
    if (!result.valid) {
      expect(typeof result.error.message).toBe("string");
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });
});

// ── webhookHandler middleware ─────────────────────────────────────────────────

/** Build a minimal fake request/response pair for testing. */
function makeReqRes(
  body: string,
  headers: Record<string, string> = {},
): { req: NodeLikeRequest; res: NodeLikeResponse & { _code: number; _body: string } } {
  const req: NodeLikeRequest = {
    body: Buffer.from(body),
    headers,
  };
  const res = {
    _code: 0,
    _body: "",
    statusCode: 0,
    setHeader(_name: string, _value: string) {},
    end(b?: string) {
      if (b) this._body = b;
    },
  } as NodeLikeResponse & { _code: number; _body: string };
  // Patch setHeader to record code via statusCode
  (res as NodeLikeResponse).setHeader = () => {};
  Object.defineProperty(res, "statusCode", {
    get() { return this._code; },
    set(v: number) { this._code = v; },
  });
  return { req, res };
}

describe("webhookHandler", () => {
  it("calls handler and replies 200 for valid delivery", async () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const { req, res } = makeReqRes(WEATHER_BODY, {
      [SIGNATURE_HEADER]: sig,
    });

    let receivedFeed = "";
    const mw = webhookHandler(SECRET, (event) => {
      receivedFeed = event.feed;
    });

    await mw(req, res);
    expect(receivedFeed).toBe("weatherdata");
    expect(res._code).toBe(200);
  });

  it("replies 400 for invalid signature", async () => {
    const { req, res } = makeReqRes(WEATHER_BODY, {
      [SIGNATURE_HEADER]: "sha256=bad",
    });

    const mw = webhookHandler(SECRET, () => {});
    await mw(req, res);
    expect(res._code).toBe(400);
  });

  it("replies 400 for missing signature header", async () => {
    const { req, res } = makeReqRes(WEATHER_BODY, {});
    const mw = webhookHandler(SECRET, () => {});
    await mw(req, res);
    expect(res._code).toBe(400);
  });

  it("replies 500 when handler throws", async () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const { req, res } = makeReqRes(WEATHER_BODY, {
      [SIGNATURE_HEADER]: sig,
    });

    const mw = webhookHandler(SECRET, () => {
      throw new Error("handler boom");
    });
    await mw(req, res);
    expect(res._code).toBe(500);
  });

  it("reads raw body from stream when no req.body", async () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const chunks = [Buffer.from(WEATHER_BODY.slice(0, 10)), Buffer.from(WEATHER_BODY.slice(10))];
    let dataHandler: ((c: unknown) => void) | null = null;
    let endHandler: (() => void) | null = null;

    const req: NodeLikeRequest = {
      headers: { [SIGNATURE_HEADER]: sig },
      on(event, cb) {
        if (event === "data") dataHandler = cb as (c: unknown) => void;
        if (event === "end") endHandler = cb as () => void;
      },
    };
    const res = {
      _code: 0,
      setHeader() {},
      end() {},
    } as unknown as NodeLikeResponse & { _code: number };
    Object.defineProperty(res, "statusCode", {
      set(v) { (res as { _code: number })._code = v; },
      get() { return (res as { _code: number })._code; },
    });

    const mw = webhookHandler(SECRET, () => {});
    const pending = mw(req, res);
    // Drive the stream
    chunks.forEach((c) => dataHandler?.(c));
    if (endHandler) (endHandler as () => void)();
    await pending;
    expect((res as { _code: number })._code).toBe(200);
  });

  it("passes timestamp header for replay protection", async () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const nowMs = Date.now();
    const { req, res } = makeReqRes(WEATHER_BODY, {
      [SIGNATURE_HEADER]: sig,
      [TIMESTAMP_HEADER]: String(nowMs),
    });

    const mw = webhookHandler(SECRET, () => {}, { toleranceSeconds: 300 });
    await mw(req, res);
    expect(res._code).toBe(200);
  });
});

// ── RaceHooks class integration ───────────────────────────────────────────────

import { RaceHooks } from "../client.js";

describe("RaceHooks class — webhook helpers", () => {
  const rh = new RaceHooks({
    clientId: "test_client",
    clientSecret: "test_secret",
    secret: SECRET,
    toleranceSeconds: 0,
  });

  it("constructEvent returns parsed event", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const event = rh.constructEvent(WEATHER_BODY, sig);
    expect(event.feed).toBe("weatherdata");
  });

  it("safeConstructEvent returns { valid: true } on success", () => {
    const sig = serverSign(SECRET, WEATHER_BODY);
    const result = rh.safeConstructEvent(WEATHER_BODY, sig);
    expect(result.valid).toBe(true);
  });

  it("safeConstructEvent returns { valid: false } on bad sig", () => {
    const result = rh.safeConstructEvent(WEATHER_BODY, "sha256=bad");
    expect(result.valid).toBe(false);
  });

  it("webhookHandler returns a middleware function", () => {
    const mw = rh.webhookHandler(() => {});
    expect(typeof mw).toBe("function");
  });

  it("constructEvent throws when no secret configured", () => {
    const rh2 = new RaceHooks({
      clientId: "c",
      clientSecret: "s",
      // no secret
    });
    const sig = serverSign(SECRET, WEATHER_BODY);
    expect(() => rh2.constructEvent(WEATHER_BODY, sig)).toThrow(WebhookSignatureError);
  });
});
