/**
 * Type-shape tests for the feed payload types.
 *
 * These verify the SDK types mirror what the API sends in live deliveries —
 * catching regressions where SDK types drift from the server feed contracts.
 * The `feed` discriminator is the canonical (hyphenated) feedId, driver identity
 * is always the full DriverRef, and fields are camelCase.
 */
import type {
  DriverRef,
  FeedId,
  WebhookPayload,
  // analytics.strategy
  StrategyPayload,
  StrategyTireHealth,
  StrategyLtoe,
  StrategyUndercutThreat,
  // analytics.race-odds
  RaceOddsPayload,
  RaceOddsPair,
  // analytics.team-points
  TeamPointsPayload,
  // analytics.qualifying
  QualifyingAnalyticsPayload,
  // analytics alert feeds
  SectorPacePayload,
  BattlePayload,
  PitWindowPayload,
  TrackConditionsPayload,
  PitQualityPayload,
  // weather cluster
  RainOnsetPayload,
  ForecastUpdatePayload,
  TireMismatchPayload,
  StrategyDivergencePayload,
  CompoundCrossoverPayload,
  // events
  RaceEventPayload,
  OvertakeData,
  QualifyingEventPayload,
  QualifyingPolePositionData,
  // results
  RaceSummaryPayload,
} from "../types.js";

const VER: DriverRef = {
  driverId: "max_verstappen",
  constructorId: "red-bull",
  number: "1",
  tla: "VER",
  name: "Max Verstappen",
  team: "Red Bull Racing",
};
const NOR: DriverRef = {
  driverId: "lando_norris",
  constructorId: "mclaren",
  number: "4",
  tla: "NOR",
  name: "Lando Norris",
  team: "McLaren F1 Team",
};

// ── analytics.strategy ──────────────────────────────────────────────────────

describe("StrategyPayload", () => {
  it("accepts a full strategy payload with spread DriverRef + sub-snapshots", () => {
    const tireHealth: StrategyTireHealth = { tireHealth: 0.55, degRateSecPerLap: 0.14, stintLap: 22 };
    const ltoe: StrategyLtoe = { ltoeSec: -0.34, expectedLapTimeSec: 91.2, actualLapTimeSec: 90.86, confidenceScale: 1 };
    const undercutThreat: StrategyUndercutThreat = { score: 0.78, viable: true, gapToCarAheadSec: 1.1, estimatedDeltaSec: -0.6 };
    const payload: StrategyPayload = {
      feed: "analytics.strategy",
      sessionId: "2026-bahrain-r1",
      raceId: "2026-bahrain-r1",
      lap: 22,
      utc: "2026-03-16T14:22:00.000Z",
      regulationsEra: "2026",
      safetyCarProbability: 0.04,
      drivers: [{ ...VER, pitStopProbability: 0.82, pitRecommended: true, paceMode: "PUSH", tireHealth, ltoe, undercutThreat }],
    };
    expect(payload.feed).toBe("analytics.strategy");
    expect(payload.drivers[0]!.tla).toBe("VER");
    expect(payload.drivers[0]!.tireHealth?.stintLap).toBe(22);
  });

  it("all fields below DriverRef are optional", () => {
    const payload: StrategyPayload = {
      feed: "analytics.strategy",
      sessionId: null,
      raceId: null,
      lap: 1,
      utc: "2026-03-16T13:00:00.000Z",
      regulationsEra: "2026",
      drivers: [{ ...NOR }],
    };
    expect(payload.drivers[0]!.pitStopProbability).toBeUndefined();
  });
});

// ── analytics.race-odds ─────────────────────────────────────────────────────

describe("RaceOddsPayload", () => {
  it("accepts a payload with DriverRef pairs and a position-change structure", () => {
    const pairs: RaceOddsPair[] = [
      { constructorId: "red-bull", driverA: VER, driverB: { ...VER, driverId: "yuki_tsunoda", number: "22", tla: "TSU", name: "Yuki Tsunoda" }, pABeatsB: 0.61, pBBeatsA: 0.37, pTie: 0.02 },
    ];
    const payload: RaceOddsPayload = {
      feed: "analytics.race-odds",
      sessionId: "2026-bahrain-r1",
      raceId: "2026-bahrain-r1",
      lap: 22,
      utc: "2026-03-16T14:22:00.000Z",
      drivers: [
        {
          ...VER,
          positionDistribution: [0.38, 0.22, 0.17, 0.1, 0.06, 0.04, 0.03],
          mostLikelyPosition: 1,
          expectedPoints: 19.4,
          podiumProbability: 0.77,
          top10Probability: 0.97,
          h2hVsTeammate: 0.61,
          positionChange: {
            next3Laps: { gainAtLeast1: 0.1, loseAtLeast1: 0.05, holdPosition: 0.85 },
            next5Laps: { gainAtLeast1: 0.15, loseAtLeast1: 0.08, holdPosition: 0.77 },
            next10Laps: { gainAtLeast1: 0.2, loseAtLeast1: 0.12, holdPosition: 0.68 },
          },
        },
      ],
      pairs,
    };
    expect(payload.drivers[0]!.podiumProbability).toBe(0.77);
    expect(payload.pairs?.[0]?.pABeatsB).toBe(0.61);
    expect(payload.pairs?.[0]?.driverA.tla).toBe("VER");
  });
});

// ── analytics.team-points ───────────────────────────────────────────────────

describe("TeamPointsPayload", () => {
  it("keys by constructorId with a numeric points distribution", () => {
    const payload: TeamPointsPayload = {
      feed: "analytics.team-points",
      sessionId: "2026-bahrain-r1",
      raceId: "2026-bahrain-r1",
      lap: 22,
      utc: "2026-03-16T14:22:00.000Z",
      constructors: [
        { constructorId: "red-bull", expectedConstructorPoints: 31.2, scoringBothDriversProbability: 0.82, podiumBothDriversProbability: 0.31, pointsDistribution: [0.01, 0.02, 0.05] },
      ],
    };
    expect(payload.constructors[0]!.expectedConstructorPoints).toBe(31.2);
    expect(Array.isArray(payload.constructors[0]!.pointsDistribution)).toBe(true);
  });
});

// ── analytics.qualifying ────────────────────────────────────────────────────

describe("QualifyingAnalyticsPayload", () => {
  it("carries segment, circuitId, and per-sector DriverRef arrays", () => {
    const payload: QualifyingAnalyticsPayload = {
      feed: "analytics.qualifying",
      sessionId: "2026-bahrain-q",
      raceId: null,
      utc: "2026-03-15T14:00:00.000Z",
      segment: "Q3",
      circuitId: "bahrain",
      sectors: {
        s1: { drivers: [{ ...VER, pFastest: 0.38, predictedDeltaMs: -45, sigma: 30 }] },
      },
      poleMarginAbove100ms: 0.7,
      poleLeader: VER,
      drivers: [{ ...VER, sector1DeltaMs: -45, sector2DeltaMs: -12, sector3DeltaMs: null }],
    };
    expect(payload.segment).toBe("Q3");
    expect(payload.circuitId).toBe("bahrain");
    expect(payload.drivers[0]!.sector3DeltaMs).toBeNull();
  });
});

// ── analytics alert feeds (data-wrapped, full DriverRef) ────────────────────

describe("analytics alert feed payloads", () => {
  it("analytics.sector-pace nests a full DriverRef and DriverRef[] for correlated drivers", () => {
    const p: SectorPacePayload = {
      feed: "analytics.sector-pace",
      sessionId: "9724",
      lap: 18,
      utc: "2026-06-01T14:23:01.123Z",
      data: {
        driver: NOR,
        raceLap: 18,
        s1: { deltaSec: 0.21, baselineMs: 28110, cleanLapCount: 6, currentMs: 28320 },
        s2: null,
        s3: null,
        anomalyDetected: true,
        anomalySector: 1,
        anomalyLevel: "WARNING",
        classifiedCause: "RAIN",
        rainConfidence: 0.62,
        crossDriverCorrelated: true,
        driversAffectedSameSector: [NOR, VER],
      },
    };
    expect(p.data.driver.tla).toBe("NOR");
    expect(p.data.driversAffectedSameSector[1]!.tla).toBe("VER");
  });

  it("battle, pit-window, track-conditions, pit-quality envelopes", () => {
    const battle: BattlePayload = {
      feed: "analytics.battle", sessionId: "9724", lap: 30, utc: "2026-06-01T14:30:00Z",
      data: { attacker: NOR, defender: VER, currentGapSec: 0.8, catchRateSecPerLap: 0.2, lapsToStrikingDistance: 4, battleStatus: "APPROACHING", forecast: { passProbabilityPerLap: 0.1, pPassWithinHorizon: 0.4, horizonLaps: 5 } },
    };
    const pitWindow: PitWindowPayload = {
      feed: "analytics.pit-window", sessionId: "9724", lap: 22, utc: "2026-06-01T14:22:00Z",
      data: { driver: VER, raceLap: 22, status: "URGENT", pitProbability: 0.74, undercutViable: true, cliffRisk: "THERMAL", overrideReason: null, vscNetDeltaSec: null, pitCount: 1 },
    };
    const track: TrackConditionsPayload = {
      feed: "analytics.track-conditions", sessionId: "9724", lap: 12, utc: "2026-06-01T14:12:00Z",
      data: { sector1: "WET", sector2: "DRYING", sector3: "DRY", fullCircuitWet: false, intermediateWindowOpen: true, crossoverRecommended: false, lastUpdatedLap: 12 },
    };
    const pitQuality: PitQualityPayload = {
      feed: "analytics.pit-quality", sessionId: "9724", lap: 22, utc: "2026-06-01T14:22:30Z",
      data: { driver: VER, raceLap: 22, stationaryTimeSec: 2.3, teamSessionAverageSec: 2.6, vsTeamSessionAverageSec: -0.3, quality: "EXCEPTIONAL", stopNumber: 1 },
    };
    expect(battle.data.attacker.tla).toBe("NOR");
    expect(pitWindow.data.pitCount).toBe(1);
    expect(track.data.sector1).toBe("WET");
    expect(pitQuality.data.quality).toBe("EXCEPTIONAL");
  });
});

// ── weather.* cluster (hyphenated feed ids, camelCase, DriverRef) ───────────

describe("weather alert feed payloads", () => {
  it("weather.rain-onset + forecast-update + tire-mismatch envelopes", () => {
    const rain: RainOnsetPayload = {
      feed: "weather.rain-onset", sessionId: "9724", lap: 14, utc: "2026-06-01T14:14:00Z",
      data: { lap: 14, precipRateMmhr: 1.2, rainStartLap: null, durationLaps: null, trackTempC: 28, airTempC: 19, humidity: 88 },
    };
    const forecast: ForecastUpdatePayload = {
      feed: "weather.forecast-update", sessionId: "9724", lap: 10, utc: "2026-06-01T14:10:00Z",
      source: "forecast", currentPrecipRateMmhr: 0, precipProbabilityPct: 65, rainExpectedInMin: 15,
      next60min: [{ timeUtc: "2026-06-01T14:25:00Z", precipRateMmhr: 0.8, precipProbabilityPct: 70 }],
    };
    const mismatch: TireMismatchPayload = {
      feed: "weather.tire-mismatch", sessionId: "9724", lap: 15, utc: "2026-06-01T14:15:00Z",
      driver: NOR, currentCompound: "MEDIUM", severity: "urgent", trigger: "raining_now",
      expectedWetOnsetLap: 15, rainProbabilityNext5Laps: 0.82, intermediateWindowOpen: true,
    };
    expect(rain.data.precipRateMmhr).toBe(1.2);
    expect(forecast.next60min[0]!.precipProbabilityPct).toBe(70);
    expect(mismatch.driver.tla).toBe("NOR");
  });

  it("weather.strategy-divergence + compound-crossover envelopes", () => {
    const divergence: StrategyDivergencePayload = {
      feed: "weather.strategy-divergence", sessionId: "9724", lap: 16, utc: "2026-06-01T14:16:00Z",
      data: {
        onWetCompounds: { count: 8, drivers: [VER, NOR], avgLapDeltaVsBaselineSec: -1.4 },
        onDryCompounds: { count: 12, drivers: [], avgLapDeltaVsBaselineSec: 2.1 },
        favoredGroup: "wet",
      },
    };
    const crossover: CompoundCrossoverPayload = {
      feed: "weather.compound-crossover", sessionId: "9724", lap: 24, utc: "2026-06-01T14:24:00Z",
      direction: "inter_to_slick", confidence: 0.78,
      evidence: { driversOnSlick: [{ ...NOR, ltoeSec: -0.6 }], driversOnInter: [{ ...VER, ltoeSec: 0.4 }] },
      rainClearedLap: 20, estimatedLapsUntilAllOnSlick: 3,
    };
    expect(divergence.data.favoredGroup).toBe("wet");
    expect(crossover.evidence.driversOnSlick[0]!.tla).toBe("NOR");
  });
});

// ── events.race / events.qualifying discriminated unions ────────────────────

describe("event feed payloads", () => {
  // The union keeps an open `{ event: string; data: Record<string, unknown> }` member for
  // forward compatibility, so TS can't auto-narrow `data` on a literal `event` check. Build
  // the body as its typed shape, assign it into the union (proving assignability), assert on it.
  it("events.race accepts a typed per-event data body", () => {
    const overtakeData: OvertakeData = {
      overtakingDriver: { ...NOR, newPosition: 3, prevPosition: 4 },
      overtakenDriver: { ...VER, newPosition: 4, prevPosition: 3 },
    };
    const overtake: RaceEventPayload = {
      feed: "events.race", sessionId: "9724", lap: 12, utc: "2026-06-01T14:12:00Z",
      event: "overtake", data: overtakeData,
    };
    expect(overtake.feed).toBe("events.race");
    expect(overtakeData.overtakingDriver.newPosition).toBe(3);
  });

  it("events.qualifying carries qualifying-specific events", () => {
    const poleData: QualifyingPolePositionData = { driver: VER, lapTime: { display: "1:27.412", ms: 87412 }, marginToP2Ms: 142 };
    const pole: QualifyingEventPayload = {
      feed: "events.qualifying", sessionId: "2026-bahrain-q", lap: 1, utc: "2026-03-15T15:00:00Z",
      event: "qualifying.pole_position", data: poleData,
    };
    expect(pole.feed).toBe("events.qualifying");
    expect(poleData.marginToP2Ms).toBe(142);
  });
});

// ── results.race-summary (legacy `type` discriminator) ──────────────────────

describe("RaceSummaryPayload", () => {
  it("uses a `type` discriminator and full DriverRef metric holders", () => {
    const summary: RaceSummaryPayload = {
      type: "race.summary.complete",
      raceId: "2026-bahrain-r1",
      raceName: "Bahrain Grand Prix",
      processedAt: "2026-03-16T16:30:00Z",
      totalSamples: 1_200_000,
      maxSpeedKph: 342.1,
      maxSpeedDriver: VER,
      avgThrottlePct: 61.2,
      avgBrakePct: 18.4,
      topAggressionDriver: NOR,
      topAggressionScore: 0.91,
      _links: { summary: "/v1/telemetry/2026-bahrain-r1", laps: "/v1/telemetry/2026-bahrain-r1/laps", stints: "/v1/telemetry/2026-bahrain-r1/stints", aggression: "/v1/telemetry/2026-bahrain-r1/aggression" },
    };
    expect(summary.type).toBe("race.summary.complete");
    expect(summary.maxSpeedDriver?.tla).toBe("VER");
  });
});

// ── generic envelope + FeedId ───────────────────────────────────────────────

describe("WebhookPayload + FeedId", () => {
  it("per-driver feeds carry a `drivers` array of DriverRef", () => {
    const raw = JSON.stringify({
      feed: "timing.data",
      sessionId: "2026-bahrain-r1",
      utc: "2026-03-16T14:22:00Z",
      drivers: [{ ...VER, position: 1, gapToLeader: { display: "0.000", seconds: 0 } }],
    });
    const payload = JSON.parse(raw) as WebhookPayload;
    expect(payload.feed).toBe("timing.data");
    expect(payload.drivers?.[0]?.driverId).toBe("max_verstappen");
  });

  it("FeedId includes the canonical hyphenated ids", () => {
    const ids: FeedId[] = ["events.race", "analytics.team-points", "weather.tire-mismatch", "timing.top-three"];
    expect(ids).toHaveLength(4);
  });
});
