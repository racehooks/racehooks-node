import type { HttpClient } from "./http.js";
import type { Event, LiveContext } from "./types.js";

export class EventsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(opts: { limit?: number; offset?: number } = {}): Promise<{ events: Event[]; total: number }> {
    const qs = new URLSearchParams();
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
    const res = await this.http.get<{ data: { events: Event[]; total: number } }>(
      `/events${qs.size ? `?${qs}` : ""}`,
    );
    return res.data;
  }
}

export class LiveNamespace {
  constructor(private readonly http: HttpClient) {}

  async context(): Promise<LiveContext> {
    const res = await this.http.get<{ data: LiveContext }>("/live/context");
    return res.data;
  }
}
