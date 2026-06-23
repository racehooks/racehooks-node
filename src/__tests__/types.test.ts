/**
 * Type-shape tests for analytics feed payload types and their sub-types.
 *
 * These tests verify that the SDK types correctly mirror the fields the API
 * sends in live Analytics-tier feed deliveries — catching regressions where
 * SDK types drift from the server's actual output.
 */
import type {
  TireHealthSnapshot,
  LTOESnapshot,
  UndercutThreatSnapshot,
  CliffRisk,
  DegMode,
  HealthLabel,
  PaceMode,
  AnalyticsStrategyPayload,
  AnalyticsRaceOddsPayload,
  AnalyticsConstructorPayload,
  AnalyticsQualifyingPayload,
  ConstructorH2HPair,
  WebhookPayload,
  AnalyticsSectorPacePayload,
  AnalyticsBattlePayload,
  AnalyticsPitWindowPayload,
  AnalyticsTrackConditionsPayload,
  AnalyticsPitQualityPayload,
  WeatherRainEventPayload,
  WeatherForecastUpdatePayload,
  WeatherTyreMismatchPayload,
  WeatherStrategyDivergencePayload,
  WeatherCompoundCrossoverPayload,
} from "../types.js";

// ── TireHealthSnapshot ────────────────────────────────────────────────────────

describe("TireHealthSnapshot", () => {
  it("accepts a full server snapshot object", () => {
    const snap: TireHealthSnapshot = {
      tireHealth: 0.72,
      tireHealthPct: 72,
      degRateSecPerLap: 0.08,
      cliffLapPredicted: 42,
      remainingUsefulLife: 8,
      cliffRisk: "THERMAL",
      cumulativeDegSec: 1.6,
      stintLaps: 15,
      confidenceLow: 0.68,
      confidenceHigh: 0.76,
      degModeActive: "DEGRADING",
      healthLabel: "MODERATE",
    };
    expect(snap.tireHealth).toBe(0.72);
    expect(snap.cliffRisk).toBe("THERMAL");
  });

  it("cliffLapPredicted accepts null (warm-up phase)", () => {
    const snap: TireHealthSnapshot = {
      tireHealth: 0.98,
      tireHealthPct: 98,
      degRateSecPerLap: 0.01,
      cliffLapPredicted: null,
      remainingUsefulLife: 30,
      cliffRisk: "NONE",
      cumulativeDegSec: 0,
      stintLaps: 2,
      confidenceLow: 0.95,
      confidenceHigh: 1.0,
      degModeActive: "WARM_UP",
      healthLabel: "GOOD",
    };
    expect(snap.cliffLapPredicted).toBeNull();
  });

  it("all CliffRisk values are valid", () => {
    const values: CliffRisk[] = ["NONE", "GRAINING", "THERMAL", "BLISTERING_RISK", "BLISTERING"];
    expect(values).toHaveLength(5);
  });

  it("all DegMode values are valid", () => {
    const values: DegMode[] = ["WARM_UP", "STABLE", "DEGRADING", "CLIFF"];
    expect(values).toHaveLength(4);
  });

  it("all HealthLabel values are valid", () => {
    const values: HealthLabel[] = ["GOOD", "MODERATE", "LOW", "CRITICAL"];
    expect(values).toHaveLength(4);
  });
});

// ── LTOESnapshot ─────────────────────────────────────────────────────────────

describe("LTOESnapshot", () => {
  it("accepts a server LTOE snapshot", () => {
    const snap: LTOESnapshot = {
      ltoeSec: -0.34,
      expectedLapTimeSec: 91.2,
      actualLapTimeSec: 90.86,
      confidenceScale: 1.0,
    };
    expect(snap.ltoeSec).toBe(-0.34);
  });

  it("confidenceScale < 1 for early-era sessions", () => {
    const snap: LTOESnapshot = {
      ltoeSec: 0.1,
      expectedLapTimeSec: 91.5,
      actualLapTimeSec: 91.6,
      confidenceScale: 0.75,
    };
    expect(snap.confidenceScale).toBeLessThan(1);
  });
});

// ── UndercutThreatSnapshot ────────────────────────────────────────────────────

describe("UndercutThreatSnapshot", () => {
  it("accepts a full undercut threat object", () => {
    const snap: UndercutThreatSnapshot = {
      score: 0.82,
      viable: true,
      gapToCarAheadSec: 1.4,
      estimatedDeltaSec: -0.8,
    };
    expect(snap.viable).toBe(true);
    expect(snap.estimatedDeltaSec).toBe(-0.8);
  });
});

// ── PaceMode values ───────────────────────────────────────────────────────────

describe("PaceMode", () => {
  it("all PaceMode values are valid", () => {
    const values: PaceMode[] = ["PUSH", "CONSERVE", "HOTLAP", "OUTLAP", "INLAP", "UNKNOWN"];
    expect(values).toHaveLength(6);
  });
});

// ── analytics.strategy payload ────────────────────────────────────────────────

describe("AnalyticsStrategyPayload", () => {
  it("accepts a full strategy payload", () => {
    const payload: AnalyticsStrategyPayload = {
      feed: "analytics.strategy",
      sessionId: "2026-bahrain-r1",
      raceId: "2026-bahrain-r1",
      lap: 22,
      utc: "2026-03-16T14:22:00.000Z",
      regulationsEra: "2026",
      safetyCarProbability: 0.04,
      drivers: [
        {
          driverId: "max_verstappen",
          constructorId: "red_bull",
          number: "1",
          tla: "VER",
          name: "Max Verstappen",
          team: "Red Bull Racing",
          pitStopProbability: 0.82,
          pitRecommended: true,
          paceMode: "PUSH",
          tireHealth: {
            tireHealth: 0.55,
            tireHealthPct: 55,
            degRateSecPerLap: 0.14,
            cliffLapPredicted: 35,
            remainingUsefulLife: 4,
            cliffRisk: "BLISTERING",
            cumulativeDegSec: 3.2,
            stintLaps: 22,
            confidenceLow: 0.5,
            confidenceHigh: 0.6,
            degModeActive: "CLIFF",
            healthLabel: "LOW",
          },
          undercutThreat: {
            score: 0.78,
            viable: true,
            gapToCarAheadSec: 1.1,
            estimatedDeltaSec: -0.6,
          },
        },
      ],
    };
    expect(payload.feed).toBe("analytics.strategy");
    expect(payload.drivers[0]!.pitStopProbability).toBe(0.82);
    expect(payload.drivers[0]!.tireHealth?.tireHealthPct).toBe(55);
  });

  it("driver fields are all optional except DriverRef identity", () => {
    const payload: AnalyticsStrategyPayload = {
      feed: "analytics.strategy",
      sessionId: null,
      raceId: null,
      lap: 1,
      utc: "2026-03-16T13:00:00.000Z",
      regulationsEra: "2026",
      drivers: [
        {
          driverId: "lando_norris",
          constructorId: "mclaren",
          number: "4",
          tla: "NOR",
          name: "Lando Norris",
          team: "McLaren F1 Team",
        },
      ],
    };
    expect(payload.drivers[0]!.pitStopProbability).toBeUndefined();
    expect(payload.drivers[0]!.tireHealth).toBeUndefined();
  });
});

// ── analytics.race-odds payload ───────────────────────────────────────────────

describe("AnalyticsRaceOddsPayload", () => {
  it("accepts a full race-odds payload with pairs", () => {
    const pairs: ConstructorH2HPair[] = [
      { constructorId: "red_bull", driverA: "1", driverB: "11", h2hAWinsProbability: 0.61 },
    ];
    const payload: AnalyticsRaceOddsPayload = {
      feed: "analytics.race-odds",
      sessionId: "2026-bahrain-r1",
      raceId: "2026-bahrain-r1",
      lap: 22,
      utc: "2026-03-16T14:22:00.000Z",
      regulationsEra: "2026",
      drivers: [
        {
          driverId: "max_verstappen",
          constructorId: "red_bull",
          number: "1",
          tla: "VER",
          name: "Max Verstappen",
          team: "Red Bull Racing",
          positionDistribution: [0, 0.38, 0.22, 0.17, 0.1, 0.06, 0.04, 0.03],
          mostLikelyPosition: 1,
          expectedPoints: 19.4,
          podiumProbability: 0.77,
          top10Probability: 0.97,
          h2hVsTeammate: 0.61,
          fastestLapProbability: 0.18,
        },
      ],
      pairs,
    };
    expect(payload.feed).toBe("analytics.race-odds");
    expect(payload.drivers[0]!.podiumProbability).toBe(0.77);
    expect(payload.pairs?.[0]?.h2hAWinsProbability).toBe(0.61);
  });
});

// ── analytics.constructor payload ─────────────────────────────────────────────

describe("AnalyticsConstructorPayload", () => {
  it("accepts a constructor payload", () => {
    const payload: AnalyticsConstructorPayload = {
      feed: "analytics.constructor",
      sessionId: "2026-bahrain-r1",
      raceId: "2026-bahrain-r1",
      lap: 22,
      utc: "2026-03-16T14:22:00.000Z",
      regulationsEra: "2026",
      constructors: [
        {
          constructorId: "red_bull",
          expectedConstructorPoints: 31.2,
          scoringBothDriversProbability: 0.82,
          pointsDistribution: { "25": 0.12, "37": 0.08, "43": 0.05 },
        },
      ],
    };
    expect(payload.feed).toBe("analytics.constructor");
    expect(payload.constructors[0]!.expectedConstructorPoints).toBe(31.2);
  });
});

// ── analytics.qualifying payload ─────────────────────────────────────────────

describe("AnalyticsQualifyingPayload", () => {
  it("accepts a qualifying payload", () => {
    const payload: AnalyticsQualifyingPayload = {
      feed: "analytics.qualifying",
      sessionId: "2026-bahrain-q",
      raceId: null,
      lap: 3,
      utc: "2026-03-15T14:00:00.000Z",
      sectors: {
        poleProbability: { "1": 0.38, "4": 0.24 },
        poleMarginMs: 142,
      },
      drivers: [
        { driverNumber: "1", driverId: "max_verstappen", sector1DeltaMs: -45, sector2DeltaMs: -12, sector3DeltaMs: null },
        { driverNumber: "4", driverId: "lando_norris",   sector1DeltaMs: 0,   sector2DeltaMs: 23,  sector3DeltaMs: -8  },
      ],
    };
    expect(payload.feed).toBe("analytics.qualifying");
    expect(payload.sectors.poleMarginMs).toBe(142);
    expect(payload.drivers[0]!.sector3DeltaMs).toBeNull();
  });
});

// ── WebhookPayload — no analytics field on timingdata ────────────────────────

describe("WebhookPayload", () => {
  it("timingdata drivers do not carry an analytics field", () => {
    const raw = JSON.stringify({
      feed: "timingdata",
      sessionId: "2026-bahrain-r1",
      drivers: [
        {
          driverId: "max_verstappen",
          constructorId: "red_bull",
          number: "1",
          tla: "VER",
          name: "Max Verstappen",
          team: "Red Bull Racing",
          position: 1,
          gapToLeader: "0.000",
        },
      ],
    });
    const payload = JSON.parse(raw) as WebhookPayload;
    const driver = payload.drivers?.[0];
    expect(driver?.driverId).toBe("max_verstappen");
    // analytics is no longer injected on timingdata — it is a standalone feed
    expect((driver as Record<string, unknown>)["analytics"]).toBeUndefined();
  });
});

// ── Live-alert + weather feed payloads (the 18 derived feeds) ──────────────────

describe("derived analytics + weather feed payloads", () => {
  it("analytics.sector-pace mirrors the SectorPaceSnapshot envelope", () => {
    const p: AnalyticsSectorPacePayload = {
      feed: "analytics.sector-pace",
      sessionId: "9724",
      lap: 18,
      utc: "2026-06-01T14:23:01.123Z",
      data: {
        driverNumber: "4",
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
        driversAffectedSameSector: ["4", "16", "44"],
      },
    };
    expect(p.data.anomalySector).toBe(1);
  });

  it("analytics.battle, pit-window, track-conditions, pit-quality envelopes", () => {
    const battle: AnalyticsBattlePayload = {
      feed: "analytics.battle", sessionId: "9724", lap: 30, utc: "2026-06-01T14:30:00Z",
      data: { attackerNumber: "4", defenderNumber: "16", currentGapSec: 0.8, catchRateSecPerLap: 0.2, lapsToStrikingDistance: 4, battleStatus: "APPROACHING" },
    };
    const pitWindow: AnalyticsPitWindowPayload = {
      feed: "analytics.pit-window", sessionId: "9724", lap: 22, utc: "2026-06-01T14:22:00Z",
      data: { driverNumber: "1", raceLap: 22, status: "URGENT", pitProbability: 0.74, undercutViable: true, cliffRisk: "THERMAL", overrideReason: null, vscNetDeltaSec: null, pitCount: 1 },
    };
    const track: AnalyticsTrackConditionsPayload = {
      feed: "analytics.track-conditions", sessionId: "9724", lap: 12, utc: "2026-06-01T14:12:00Z",
      data: { sector1: "WET", sector2: "DRYING", sector3: "DRY", fullCircuitWet: false, intermediateWindowOpen: true, crossoverRecommended: false, lastUpdatedLap: 12 },
    };
    const pitQuality: AnalyticsPitQualityPayload = {
      feed: "analytics.pit-quality", sessionId: "9724", lap: 22, utc: "2026-06-01T14:22:30Z",
      data: { driverNumber: "1", teamName: "Red Bull Racing", raceLap: 22, stationaryTimeSec: 2.3, teamSessionAverageSec: 2.6, vsTeamSessionAverageSec: -0.3, quality: "EXCEPTIONAL", stopNumber: 1 },
    };
    expect(pitWindow.data.pitCount).toBe(1);
    expect(track.data.sector1).toBe("WET");
    expect(battle.data.battleStatus).toBe("APPROACHING");
    expect(pitQuality.data.quality).toBe("EXCEPTIONAL");
  });

  it("weather.rain_onset/cleared, forecast_update, tyre_mismatch envelopes", () => {
    const rain: WeatherRainEventPayload = {
      feed: "weather.rain_onset", sessionId: "9724", event: "rain_onset", lap: 14, utc: "2026-06-01T14:14:00Z",
      data: { type: "rain_onset", lap: 14, precipRateMmhr: 1.2, rainStartLap: null, durationLaps: null, trackTempC: 28, airTempC: 19, humidity: 88 },
    };
    const forecast: WeatherForecastUpdatePayload = {
      feed: "weather.forecast_update", sessionId: "9724", event: "weather.forecast_update", lap: 10, utc: "2026-06-01T14:10:00Z",
      source: "open-meteo", model: "ukmo_seamless", currentPrecipRateMmhr: 0.0, precipProbabilityPct: 65,
      next60min: [{ timeUtc: "2026-06-01T14:25:00Z", precipRateMmhr: 0.8, precipProbabilityPct: 70 }],
    };
    const mismatch: WeatherTyreMismatchPayload = {
      feed: "weather.tyre_mismatch", event: "weather.tyre_mismatch", sessionId: "9724", lap: 15, utc: "2026-06-01T14:15:00Z",
      driver: { driverId: "lando_norris", constructorId: "mclaren", number: "4", tla: "NOR", name: "Lando Norris", team: "McLaren F1 Team" },
      currentCompound: "MEDIUM", severity: "urgent", trigger: "raining_now", expectedWetOnsetLap: 15, rainProbabilityNext5Laps: 0.82, intermediateWindowOpen: true,
    };
    expect(rain.data.precipRateMmhr).toBe(1.2);
    expect(forecast.next60min[0].precipProbabilityPct).toBe(70);
    expect(mismatch.severity).toBe("urgent");
  });

  it("weather.strategy_divergence + compound_crossover_alert envelopes", () => {
    const divergence: WeatherStrategyDivergencePayload = {
      feed: "weather.strategy_divergence", sessionId: "9724", event: "weather.strategy_divergence", lap: 16, utc: "2026-06-01T14:16:00Z",
      data: {
        on_wet_compounds: { count: 8, driver_numbers: ["1", "4", "16"], avg_lap_delta_vs_baseline_sec: -1.4 },
        on_dry_compounds: { count: 12, driver_numbers: ["44", "63"], avg_lap_delta_vs_baseline_sec: 2.1 },
        favored_group: "wet_compounds",
      },
    };
    const crossover: WeatherCompoundCrossoverPayload = {
      feed: "weather.compound_crossover_alert", sessionId: "9724", event: "weather.compound_crossover_alert", lap: 24, utc: "2026-06-01T14:24:00Z",
      direction: "inter_to_slick", confidence: 0.78,
      evidence: { drivers_on_slick: [{ driverNumber: "44", ltoeSec: -0.6 }], drivers_on_inter: [{ driverNumber: "1", ltoeSec: 0.4 }] },
      rain_cleared_lap: 20, estimated_laps_until_all_on_slick: 3,
    };
    expect(divergence.data.favored_group).toBe("wet_compounds");
    expect(crossover.evidence.drivers_on_slick[0].driverNumber).toBe("44");
  });
});
