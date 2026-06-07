import { TokenManager, RaceHooksAPIError } from "./auth.js";

// Thin fetch wrapper: attaches Bearer token, handles 401 retry, throws typed errors.

export class HttpClient {
  constructor(
    private readonly tokens: TokenManager,
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retried = false,
  ): Promise<T> {
    const token = await this.tokens.get();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/v1${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // Token expired mid-flight — invalidate cache and retry once
    if (res.status === 401 && !retried) {
      this.tokens.invalidate();
      return this.request<T>(method, path, body, true);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new RaceHooksAPIError(
        `RaceHooks API error ${res.status}: ${text}`,
        res.status,
        text,
      );
    }

    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
  }

  get<T>(path: string) { return this.request<T>("GET", path); }
  post<T>(path: string, body?: unknown) { return this.request<T>("POST", path, body); }
  patch<T>(path: string, body: unknown) { return this.request<T>("PATCH", path, body); }
  delete<T>(path: string) { return this.request<T>("DELETE", path); }
}
