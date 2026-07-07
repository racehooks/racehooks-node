# racehooks

Official Node.js/TypeScript SDK for [RaceHooks](https://racehooks.io) — the motorsports analytics platform. Subscribe to 50+ live F1 feeds with production ML models enriching every Analytics-tier payload, verify HMAC signatures, and query live and historical race data — all fully typed.

[![npm](https://img.shields.io/npm/v/racehooks)](https://www.npmjs.com/package/racehooks)
[![Node.js ≥ 18](https://img.shields.io/node/v/racehooks)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-3178c6)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

```bash
npm install racehooks
```

Get your API credentials at [racehooks.io](https://racehooks.io).

## Quick start

```ts
import { RaceHooks } from "racehooks";

const rh = new RaceHooks({
  clientId:     process.env.RACEHOOKS_CLIENT_ID!,
  clientSecret: process.env.RACEHOOKS_CLIENT_SECRET!,
});

// Subscribe to all race events (overtakes, pit stops, safety cars, DNFs, …)
const { webhook, webhookSecret } = await rh.webhooks.create({
  feedId:     "events.race",
  webhookUrl: "https://yourserver.com/webhook",
});

// SAVE webhookSecret immediately — it is shown only once.
console.log("Signing secret:", webhookSecret);
```

Your endpoint will now receive JSON payloads like:

```json
{
  "feed": "events.race",
  "sessionId": "2026-bahrain_r",
  "event": "overtake",
  "lap": 34,
  "utc": "2026-06-01T14:23:01.123Z",
  "data": {
    "overtakingDriver": {
      "number": "4", "driverId": "lando_norris", "constructorId": "mclaren",
      "tla": "NOR", "name": "Lando Norris", "team": "McLaren F1 Team",
      "newPosition": 1, "prevPosition": 2
    },
    "overtakenDriver": {
      "number": "1", "driverId": "max_verstappen", "constructorId": "red-bull",
      "tla": "VER", "name": "Max Verstappen", "team": "Red Bull Racing",
      "newPosition": 2, "prevPosition": 1
    }
  }
}
```

Every payload carries the full **`DriverRef`** identity block (`number`, `driverId`,
`constructorId`, `tla`, `name`, `team`) — no need to join against `driver.list`.

## Verify signatures in your endpoint

```ts
import { verifySignatureBoolean } from "racehooks";
import type { IncomingMessage } from "http";

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise(resolve => {
    const chunks: Buffer[] = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// Express example
app.post("/webhook", async (req, res) => {
  const raw = await readBody(req);
  const sig = req.headers["x-racehooks-signature"] as string;

  if (!verifySignatureBoolean(raw, sig, process.env.WEBHOOK_SECRET!)) {
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
  feedId:     "timing.data",
  webhookUrl: "https://yourserver.com/webhook",
  filters: {
    constructors: ["ferrari"],
    positions:    { min: 1, max: 5 },
  },
});

// Overtakes and pit stops for VER and NOR only
await rh.webhooks.create({
  feedId:     "events.race",
  webhookUrl: "https://yourserver.com/webhook",
  filters: { drivers: ["VER", "NOR"] },
});
```

## Race Events feed

Subscribe to [`feedId: "events.race"`](https://racehooks.io/docs/feeds/race-events) to receive structured events derived from live timing:

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

## Analytics tier

On the [Analytics tier](https://racehooks.io/pricing), RaceHooks delivers a suite of derived
`analytics.*` and `weather.*` feeds, backed by production ML models and an algorithmic
intelligence layer (CTMC win/podium probability with a full position distribution, ECP/ECPA,
EKF tyre health). Each is an independently-subscribable feed with a fully-typed payload:

```ts
import type { StrategyPayload } from "racehooks";

// Per-lap strategy signals: pit probability, undercut threat, tyre health, LTOE
await rh.webhooks.create({
  feedId:     "analytics.strategy",
  webhookUrl: "https://yourserver.com/webhook",
});

app.post("/webhook", (req, res) => {
  const payload: StrategyPayload = req.body;
  for (const d of payload.drivers) {
    // Each driver spreads the full DriverRef, plus optional per-model snapshots.
    console.log(d.tla, d.pitStopProbability, d.tireHealth?.tireHealth, d.ltoe?.ltoeSec);
  }
  res.sendStatus(200);
});
```

Every feed's `feed` discriminator is its canonical (hyphenated) feedId, and each has a
matching exported payload type:

- **Strategy & outcomes:** `analytics.strategy`, `analytics.race-odds`, `analytics.true-pace`, `analytics.gap-projection`, `analytics.winning-margin`, `analytics.tire-strategy`, `analytics.team-points`, `analytics.championship-probability`, `analytics.qualifying`
- **Pre-race & duration:** `analytics.race-preview`, `analytics.race-duration`
- **Live alerts:** `analytics.sector-pace`, `analytics.battle`, `analytics.pit-window`, `analytics.track-conditions`, `analytics.pit-quality`
- **Predictive weather:** `weather.forecast-update`, `weather.rain-onset`, `weather.rain-cleared`, `weather.tire-mismatch`, `weather.strategy-divergence`, `weather.compound-crossover`

## Historical data & insights

Query race results, lap times, driver profiles, and post-race ML analytics for any session going back to 2020:

```ts
// Driver results and standings
const verstappen = await rh.data.getDriver("max_verstappen");
const results    = await rh.data.getDriverResults("max_verstappen", { season: 2026 });

// Full race — qualifying, pit stops, tyre stints, lap times
const race    = await rh.data.getRace("2026-bahrain-r1");
const pitstops = await rh.data.getRacePitstops("2026-bahrain-r1");
const tyres    = await rh.data.getRaceTyres("2026-bahrain-r1");
const laps     = await rh.data.getRaceLaps("2026-bahrain-r1");

// Post-race ML analytics bundle — pit probability, tyre health, win probability per driver per lap
const insights = await rh.insights.getRace("2026-bahrain-r1");
```

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
const sim = await rh.simulate.start({ sessionId: "2026-bahrain_r", speed: 10 });
await rh.simulate.get(sim.simulationId);
await rh.simulate.cancel(sim.simulationId);

// Historical data
await rh.data.listDrivers({ active: true });
await rh.data.getDriverStandings("max_verstappen", { season: 2026 });
await rh.data.listConstructors();
await rh.data.getSeasonRaces(2026);
await rh.data.getRaceQualifying("2026-bahrain-r1");
await rh.data.getRaceWeather("2026-bahrain-r1");

// Post-race ML insights
await rh.insights.listRaces({ season: 2026 });
await rh.insights.getRace("2026-bahrain-r1");
await rh.insights.getModelMeta();

// Telemetry (Live tier)
await rh.telemetry.getRaceLaps("2026-bahrain-r1", { driverId: "max_verstappen" });
await rh.telemetry.getRaceSummary("2026-bahrain-r1");

// Fantasy scoring
await rh.fantasy.getRaceScores("2026-bahrain-r1");
await rh.fantasy.getSessionPitTimes("2026-bahrain_r");

// Usage & billing
await rh.usage.subscription();   // tier, limits, usage snapshot
await rh.usage.current();        // today's delivery count
await rh.usage.byFeed();         // delivery breakdown per feedId
await rh.usage.history();        // last 90 periods
```

## Requirements

- Node.js ≥ 18
- ESM and CJS both supported

## Links

- [RaceHooks console](https://racehooks.io/console) — sign up and manage your account
- [RaceHooks API documentation](https://racehooks.io/docs)
- [Webhook API reference](https://racehooks.io/docs/webhooks)
- [Feed catalog](https://racehooks.io/docs/feeds)
- [GitHub](https://github.com/racehooks/racehooks-node)
- [npm](https://www.npmjs.com/package/racehooks)

---

> RaceHooks is an independent service and is not affiliated with or endorsed by Formula One Management or the FIA. "Formula 1," "F1," and related marks are trademarks of Formula One Licensing BV.
