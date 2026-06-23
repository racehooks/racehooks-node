import type { HttpClient } from "./http.js";
import type { SubscriptionData, UsageByFeedEntry, BillingPlan, TierConfig } from "./types.js";

export interface UsageHistory {
  period: string;
  deliveryCount: number;
  failureCount: number;
}

export interface LatencyByFeedEntry {
  feedId: string;
  sampleCount: number;
  p50: number;
  p95: number;
  p99: number;
}

export class UsageNamespace {
  constructor(private readonly http: HttpClient) {}

  async subscription(): Promise<SubscriptionData> {
    const res = await this.http.get<{ data: SubscriptionData }>("/subscription");
    return res.data;
  }

  async upgradeSubscription(): Promise<{ message: string; availableTiers: string[] }> {
    const res = await this.http.post<{ data: { message: string; availableTiers: string[] } }>("/subscription/upgrade");
    return res.data;
  }

  async current(): Promise<{
    period: string;
    tier: string;
    deliveryCount: number;
    failureCount: number;
    dailyDeliveryLimit: number | "unlimited";
    dailyRemaining: number | null;
  }> {
    const res = await this.http.get<{ data: {
      period: string; tier: string; deliveryCount: number;
      failureCount: number; dailyDeliveryLimit: number | "unlimited"; dailyRemaining: number | null;
    } }>("/usage");
    return res.data;
  }

  async byFeed(): Promise<{ period: string; byFeed: UsageByFeedEntry[] }> {
    const res = await this.http.get<{ data: { period: string; byFeed: UsageByFeedEntry[] } }>("/usage/by-feed");
    return res.data;
  }

  async latency(): Promise<{ period: string; byFeed: LatencyByFeedEntry[] }> {
    const res = await this.http.get<{ data: { period: string; byFeed: LatencyByFeedEntry[] } }>("/usage/latency");
    return res.data;
  }

  async hourly(): Promise<{ hours: number[] }> {
    const res = await this.http.get<{ data: { hours: number[] } }>("/usage/hourly");
    return res.data;
  }

  async history(): Promise<UsageHistory[]> {
    const res = await this.http.get<{ data: { history: UsageHistory[] } }>("/usage/history");
    return res.data.history;
  }

  async billingPlan(): Promise<BillingPlan> {
    const res = await this.http.get<{ data: BillingPlan }>("/billing/plan");
    return res.data;
  }

  async tiers(): Promise<TierConfig[]> {
    const res = await this.http.get<{ tiers: TierConfig[] }>("/billing/tiers");
    return res.tiers;
  }
}
