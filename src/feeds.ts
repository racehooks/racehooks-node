import type { HttpClient } from "./http.js";
import type { Feed, PaginatedResult } from "./types.js";

export class FeedsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(opts: { limit?: number; offset?: number } = {}): Promise<PaginatedResult<Feed>> {
    const qs = new URLSearchParams();
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
    const res = await this.http.get<{ data: { feeds: Feed[]; total: number; limit: number; offset: number } }>(
      `/feeds${qs.size ? `?${qs}` : ""}`,
    );
    return { data: res.data.feeds, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  }
}
