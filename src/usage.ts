import type { HttpClient } from "./http.js";
import type { SubscriptionData, UsageByFeedEntry } from "./types.js";

export interface UsageHistory {
  period: string;
  deliveryCount: number;
  failureCount: number;
}

export class UsageNamespace {
  constructor(private readonly http: HttpClient) {}

  async subscription(): Promise<SubscriptionData> {
    const res = await this.http.get<{ data: SubscriptionData }>("/subscription");
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

  async history(): Promise<UsageHistory[]> {
    const res = await this.http.get<{ data: { history: UsageHistory[] } }>("/usage/history");
    return res.data.history;
  }
}
