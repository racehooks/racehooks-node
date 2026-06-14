/**
 * Type-shape tests for DriverAnalytics and analytics sub-types.
 *
 * These tests verify that the SDK types correctly mirror the fields the API
 * sends in live Analytics-tier payloads — catching regressions where SDK
 * types drift from the server's actual output.
 */
import type {
  DriverAnalytics,
  TireHealthSnapshot,
  WinProbabilitySnapshot,
  LTOESnapshot,
  UndercutThreatSnapshot,
  CliffRisk,
  DegMode,
  HealthLabel,
  WebhookPayload,
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

// ── WinProbabilitySnapshot ────────────────────────────────────────────────────

describe("WinProbabilitySnapshot", () => {
  it("accepts a full server snapshot", () => {
    const snap: WinProbabilitySnapshot = {
      driverNumber: "44",
      winProbability: 0.31,
      podiumProbability: 0.74,
      ecp: 12.4,
      ecpa: 0.3,
      positionDistribution: [0, 0.31, 0.22, 0.21, 0.1, 0.06, 0.05, 0.03, 0.02],
    };
    expect(snap.winProbability).toBe(0.31);
    expect(snap.positionDistribution[1]).toBe(0.31);
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

// ── DriverAnalytics shape ─────────────────────────────────────────────────────

describe("DriverAnalytics", () => {
  it("tireHealth field is TireHealthSnapshot object, not a number", () => {
    const analytics: DriverAnalytics = {
      regulationsEra: "2026",
      tireHealth: {
        tireHealth: 0.6,
        tireHealthPct: 60,
        degRateSecPerLap: 0.12,
        cliffLapPredicted: 38,
        remainingUsefulLife: 5,
        cliffRisk: "BLISTERING_RISK",
        cumulativeDegSec: 2.4,
        stintLaps: 20,
        confidenceLow: 0.55,
        confidenceHigh: 0.65,
        degModeActive: "CLIFF",
        healthLabel: "LOW",
      },
      pitStopProbability: 0.72,
      pitRecommended: true,
      safetyCarProbability: 0.04,
      overtakeProbability: 0.15,
    };
    expect(typeof analytics.tireHealth).toBe("object");
    expect(analytics.tireHealth!.tireHealthPct).toBe(60);
    expect(analytics.tireHealth!.cliffRisk).toBe("BLISTERING_RISK");
  });

  it("degRateSecPerLap lives inside tireHealth, not top-level", () => {
    const analytics: DriverAnalytics = {
      tireHealth: {
        tireHealth: 0.8,
        tireHealthPct: 80,
        degRateSecPerLap: 0.09,
        cliffLapPredicted: null,
        remainingUsefulLife: 20,
        cliffRisk: "NONE",
        cumulativeDegSec: 0.9,
        stintLaps: 10,
        confidenceLow: 0.76,
        confidenceHigh: 0.84,
        degModeActive: "STABLE",
        healthLabel: "GOOD",
      },
    };
    expect(analytics.tireHealth?.degRateSecPerLap).toBe(0.09);
    // Top-level degRateSecPerLap no longer exists on DriverAnalytics
    expect("degRateSecPerLap" in analytics).toBe(false);
  });

  it("all optional fields accept undefined (Analytics tier not enabled)", () => {
    const analytics: DriverAnalytics = {};
    expect(analytics.tireHealth).toBeUndefined();
    expect(analytics.winProbability).toBeUndefined();
    expect(analytics.ltoe).toBeUndefined();
    expect(analytics.undercutThreat).toBeUndefined();
  });

  it("winProbability is WinProbabilitySnapshot, not a flat number", () => {
    const analytics: DriverAnalytics = {
      winProbability: {
        driverNumber: "1",
        winProbability: 0.25,
        podiumProbability: 0.6,
        ecp: 9.8,
        ecpa: -0.1,
        positionDistribution: [0, 0.25, 0.18, 0.17],
      },
    };
    expect(typeof analytics.winProbability).toBe("object");
    expect(analytics.winProbability!.winProbability).toBe(0.25);
  });

  it("ltoe contains confidenceScale", () => {
    const analytics: DriverAnalytics = {
      ltoe: {
        ltoeSec: 0.22,
        expectedLapTimeSec: 90.1,
        actualLapTimeSec: 90.32,
        confidenceScale: 0.75,
      },
      ltoeConfidenceFlag: "2026_early",
    };
    expect(analytics.ltoe!.confidenceScale).toBe(0.75);
    expect(analytics.ltoeConfidenceFlag).toBe("2026_early");
  });
});

// ── WebhookPayload with DriverAnalytics ───────────────────────────────────────

describe("WebhookPayload drivers with analytics", () => {
  it("parses a timingdata payload with full analytics block", () => {
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
          analytics: {
            regulationsEra: "2026",
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
            pitStopProbability: 0.88,
            pitRecommended: true,
          },
        },
      ],
    });

    const payload = JSON.parse(raw) as WebhookPayload;
    const driver = payload.drivers?.[0];
    expect(driver?.analytics?.pitRecommended).toBe(true);
    expect((driver?.analytics?.tireHealth as TireHealthSnapshot | undefined)?.tireHealthPct).toBe(55);
  });
});
