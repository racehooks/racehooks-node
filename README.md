# racehooks

Official Node.js SDK for [RaceHooks](https://racehooks.io) — real-time [F1 live timing](https://docs.racehooks.io/feeds) webhook delivery.

[![npm](https://img.shields.io/npm/v/racehooks)](https://www.npmjs.com/package/racehooks)
[![Node.js ≥ 18](https://img.shields.io/node/v/racehooks)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> RaceHooks is an independent service and is not affiliated with or endorsed by Formula One Management or the FIA. "Formula 1," "F1," and related marks are trademarks of Formula One Licensing BV.

```bash
npm install racehooks
```

Get your API credentials at [racehooks.io](https://racehooks.io).

## Quick start

```ts
import { RaceHooks, verifySignature } from "racehooks";

const rh = new RaceHooks({
  clientId:     process.env.RACEHOOKS_CLIENT_ID!,
  clientSecret: process.env.RACEHOOKS_CLIENT_SECRET!,
});

// Subscribe to all race events (overtakes, pit stops, safety cars, DNFs, …)
const { webhook, webhookSecret } = await rh.webhooks.create({
  feedId:     "raceevent",
  webhookUrl: "https://yourserver.com/f1-hook",
});

// SAVE webhookSecret immediately — it is shown only once.
console.log("Signing secret:", webhookSecret);
```

Your endpoint will now receive JSON payloads like:

```json
{
  "type": "raceevent",
  "sessionId": "9724",
  "event": "overtake",
  "lap": 34,
  "utc": "2026-06-01T14:23:01.123Z",
  "data": {
    "driver": "4",  "tla": "NOR",  "team": "McLaren F1 Team",
    "fromPosition": 2, "toPosition": 1,
    "displaced": { "driver": "1", "tla": "VER", "team": "Red Bull Racing" }
  }
}
```

## Verify signatures in your endpoint

```ts
import { verifySignature } from "racehooks";
import type { IncomingMessage } from "http";

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise(resolve => {
    const chunks: Buffer[] = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// Express example
app.post("/f1-hook", async (req, res) => {
  const raw = await readBody(req);
  const sig = req.headers["x-racehooks-signature"] as string;

  if (!verifySignature(raw, sig, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).send("Bad signature");
  }

  const payload = JSON.parse(raw.toString());
  console.log("Event:", payload.event, payload.data);
  res.sendStatus(200);
});
```

## Filters

Narrow which payloads get delivered — any combination of driver TLAs, constructor keywords, and position range.

```ts
// Ferrari drivers only, while they're in the top 5
await rh.webhooks.create({
  feedId:     "timingdata",
  webhookUrl: "https://yourserver.com/hook",
  filters: {
    constructors: ["ferrari"],
    positions:    { min: 1, max: 5 },
  },
});

// Overtakes and pit stops for VER and NOR only
await rh.webhooks.create({
  feedId:     "raceevent",
  webhookUrl: "https://yourserver.com/hook",
  filters: { drivers: ["VER", "NOR"] },
});
```

## Race Events feed

Subscribe to [`feedId: "raceevent"`](https://docs.racehooks.io/feeds/raceevent) to receive structured events derived from live F1 timing data:

| event | when |
|-------|------|
| `session.start` | Session status → "Started" |
| `overtake` | On-track position gain (race/sprint only) |
| `pit.entry` | Driver enters pit lane |
| `pit.exit` | Driver exits pit lane |
| `lead.change` | P1 driver changes |
| `safety.car.deployed` | Full SC or VSC deployed |
| `safety.car.cleared` | SC/VSC ending or cleared |
| `fastest.lap` | New session fastest lap set |
| `retirement` | Driver retires |

## All namespaces

```ts
// Webhooks
await rh.webhooks.list();
await rh.webhooks.get(webhookId);
await rh.webhooks.update(webhookId, { active: false });
await rh.webhooks.delete(webhookId);
await rh.webhooks.test(webhookId);
await rh.webhooks.logs(webhookId, { limit: 50 });
await rh.webhooks.rotateSecret(webhookId);

// Feeds
await rh.feeds.list();

// Events & live session
await rh.events.list();
await rh.live.context();     // current drivers, positions, flag, RC messages

// Simulate (replay historical sessions against your webhooks)
const sim = await rh.simulate.start({ sessionId: "...", speed: 10 });
await rh.simulate.get(sim.simulationId);
await rh.simulate.cancel(sim.simulationId);

// Usage & billing
await rh.usage.subscription();   // tier, limits, usage snapshot
await rh.usage.current();        // today's delivery count
await rh.usage.byFeed();         // delivery breakdown per feedId
await rh.usage.history();        // last 90 periods
```

## Analytics tier

On the [Analytics tier](https://racehooks.io/pricing), `timingdata`, `cardata`, and `tyrestintseries` webhook payloads include ML-computed `analytics.*` fields per driver:

```ts
import type { WebhookPayload } from "racehooks";

app.post("/hook", (req, res) => {
  const payload: WebhookPayload = req.body;
  const driverNumber = "1";
  const driver1analytics = payload.analytics?.[driverNumber];
  // {
  //   tireHealth: 0.72,
  //   cliffLapPredicted: 38,
  //   cliffRisk: "medium",
  //   pitStopProbability: 0.31,
  //   pitRecommended: false,
  //   safetyCarProbability: 0.12,
  // }
});
```

## Requirements

- Node.js ≥ 18
- ESM and CJS both supported

## Links

- [RaceHooks console](https://racehooks.io) — sign up and manage your account
- [F1 live timing API documentation](https://docs.racehooks.io)
- [F1 webhook API reference](https://docs.racehooks.io/api)
- [F1 live timing feed catalog](https://docs.racehooks.io/feeds)
- [GitHub](https://github.com/racehooks/racehooks-node)
- [npm](https://www.npmjs.com/package/racehooks)
