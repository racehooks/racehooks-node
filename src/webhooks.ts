import type { HttpClient } from "./http.js";
import type {
  Webhook, WebhookEndpoint, DeliveryLog, PaginatedResult,
  CreateWebhookOptions, CreateWebhookSingleOptions, CreateWebhookFeedIdsOptions,
  CreateWebhookSubscriptionsOptions, CreateWebhookResult, CreateWebhookEndpointResult,
} from "./types.js";

/** Fields `webhooks.update()` accepts (endpoint-level; cascades to every feed on the endpoint). */
export type UpdateWebhookPatch = Partial<Pick<Webhook, "webhookUrl" | "webhookMethod" | "active" | "filters">>;

export class WebhooksNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a webhook endpoint.
   *
   * - `{ feedId }` (legacy single feed) → `{ webhook, webhookSecret, tier }`.
   * - `{ feedIds }` (supports `"*"` / `"analytics.*"` globs) or `{ subscriptions }`
   *   (per-feed filters) → `{ webhookId, webhookUrl, webhookMethod, subscriptions, webhookSecret, tier }`.
   *
   * The signing secret is returned once, here.
   */
  async create(opts: CreateWebhookSingleOptions): Promise<CreateWebhookResult>;
  async create(opts: CreateWebhookFeedIdsOptions | CreateWebhookSubscriptionsOptions): Promise<CreateWebhookEndpointResult>;
  async create(opts: CreateWebhookOptions): Promise<CreateWebhookResult | CreateWebhookEndpointResult>;
  async create(opts: CreateWebhookOptions): Promise<CreateWebhookResult | CreateWebhookEndpointResult> {
    const body: Record<string, unknown> = {
      webhookUrl: opts.webhookUrl,
      webhookMethod: opts.webhookMethod ?? "post",
      filters: opts.filters ?? {},
    };
    if (opts.seriesId !== undefined) body.seriesId = opts.seriesId;
    if (opts.subscriptions !== undefined) body.subscriptions = opts.subscriptions;
    else if (opts.feedIds !== undefined) body.feedIds = opts.feedIds;
    else body.feedId = opts.feedId;
    const res = await this.http.post<{ data: CreateWebhookResult | CreateWebhookEndpointResult }>("/webhooks", body);
    return res.data;
  }

  /**
   * List feed subscriptions, one row per (endpoint, feed) — `GET /v1/webhooks?shape=flat`.
   * `total` counts subscription rows. Use {@link listEndpoints} for the grouped view.
   */
  async list(opts: { limit?: number; offset?: number } = {}): Promise<PaginatedResult<Webhook>> {
    const qs = new URLSearchParams({ shape: "flat" });
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
    const res = await this.http.get<{ data: { webhooks: Webhook[]; total: number; limit: number; offset: number } }>(
      `/webhooks?${qs}`,
    );
    return { data: res.data.webhooks, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  }

  /**
   * List endpoints, each grouping its feed subscriptions — `GET /v1/webhooks` (grouped,
   * the server default). `total` counts endpoints.
   */
  async listEndpoints(opts: { limit?: number; offset?: number } = {}): Promise<PaginatedResult<WebhookEndpoint>> {
    const qs = new URLSearchParams();
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
    const res = await this.http.get<{ data: { endpoints: WebhookEndpoint[]; total: number; limit: number; offset: number } }>(
      `/webhooks${qs.size ? `?${qs}` : ""}`,
    );
    return { data: res.data.endpoints, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  }

  /** Get one endpoint with its feed subscriptions and 7-day delivery stats. */
  async get(webhookId: string): Promise<WebhookEndpoint> {
    const res = await this.http.get<{ data: { endpoint: WebhookEndpoint } }>(`/webhooks/${webhookId}`);
    return res.data.endpoint;
  }

  /**
   * Update an endpoint. `webhookUrl` / `webhookMethod` / `active` / `filters` cascade to
   * every feed on the endpoint. Returns the updated endpoint (no `stats`).
   */
  async update(webhookId: string, patch: UpdateWebhookPatch): Promise<WebhookEndpoint> {
    const res = await this.http.patch<{ data: { endpoint: WebhookEndpoint } }>(`/webhooks/${webhookId}`, patch);
    return res.data.endpoint;
  }

  async delete(webhookId: string): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  async logs(webhookId: string, opts: { limit?: number; offset?: number } = {}): Promise<PaginatedResult<DeliveryLog>> {
    const qs = new URLSearchParams();
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
    const res = await this.http.get<{ data: { logs: DeliveryLog[]; total: number; limit: number; offset: number } }>(
      `/webhooks/${webhookId}/logs${qs.size ? `?${qs}` : ""}`,
    );
    return { data: res.data.logs, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  }

  async getSecret(webhookId: string): Promise<string> {
    const res = await this.http.get<{ data: { webhookId: string; webhookSecret: string } }>(
      `/webhooks/${webhookId}/secret`,
    );
    return res.data.webhookSecret;
  }

  async test(webhookId: string): Promise<{ delivered: boolean; statusCode: number; errorMessage: string | null }> {
    const res = await this.http.post<{ data: { delivered: boolean; statusCode: number; errorMessage: string | null } }>(
      `/webhooks/${webhookId}/test`,
    );
    return res.data;
  }

  async rotateSecret(webhookId: string): Promise<{ webhookId: string; webhookSecret: string }> {
    const res = await this.http.post<{ data: { webhookId: string; webhookSecret: string; note: string } }>(
      `/webhooks/${webhookId}/rotate-secret`,
    );
    return { webhookId: res.data.webhookId, webhookSecret: res.data.webhookSecret };
  }
}
