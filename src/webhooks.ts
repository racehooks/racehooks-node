import type { HttpClient } from "./http.js";
import type {
  Webhook, DeliveryLog, CreateWebhookOptions, CreateWebhookResult, PaginatedResult,
} from "./types.js";

export class WebhooksNamespace {
  constructor(private readonly http: HttpClient) {}

  async create(opts: CreateWebhookOptions): Promise<CreateWebhookResult> {
    const res = await this.http.post<{ data: CreateWebhookResult }>("/webhooks", {
      feedId: opts.feedId,
      webhookUrl: opts.webhookUrl,
      webhookMethod: opts.webhookMethod ?? "post",
      filters: opts.filters ?? {},
    });
    return res.data;
  }

  async list(opts: { limit?: number; offset?: number } = {}): Promise<PaginatedResult<Webhook>> {
    const qs = new URLSearchParams();
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
    const res = await this.http.get<{ data: { webhooks: Webhook[]; total: number; limit: number; offset: number } }>(
      `/webhooks${qs.size ? `?${qs}` : ""}`,
    );
    return { data: res.data.webhooks, total: res.data.total, limit: res.data.limit, offset: res.data.offset };
  }

  async get(webhookId: string): Promise<Webhook> {
    const res = await this.http.get<{ data: { webhook: Webhook } }>(`/webhooks/${webhookId}`);
    return res.data.webhook;
  }

  async update(webhookId: string, patch: Partial<Pick<Webhook, "webhookUrl" | "webhookMethod" | "active" | "filters">>): Promise<Webhook> {
    const res = await this.http.patch<{ data: { webhook: Webhook } }>(`/webhooks/${webhookId}`, patch);
    return res.data.webhook;
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
