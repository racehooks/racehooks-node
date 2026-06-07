// Token lifecycle management — OAuth 2 client credentials flow.
// Tokens are cached in-process until 60 seconds before expiry.

interface TokenCache {
  token: string;
  expiresAt: number; // unix ms
}

export class TokenManager {
  private cache: TokenCache | null = null;
  private inflight: Promise<string> | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async get(): Promise<string> {
    const now = Date.now();
    // Serve cached token if it has more than 60 seconds remaining
    if (this.cache && this.cache.expiresAt - now > 60_000) {
      return this.cache.token;
    }

    // Deduplicate concurrent requests for a new token
    if (this.inflight) return this.inflight;

    this.inflight = this.fetch();
    try {
      const token = await this.inflight;
      return token;
    } finally {
      this.inflight = null;
    }
  }

  invalidate(): void {
    this.cache = null;
  }

  private async fetch(): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/v1/oauth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: this.clientId, client_secret: this.clientSecret }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new RaceHooksAuthError(`Authentication failed (${res.status}): ${text}`);
    }

    const json = await res.json() as { data?: { token?: string; expiresAt?: string } };
    const token = json?.data?.token;
    if (!token) throw new RaceHooksAuthError("No token in OAuth response");

    const expiresAt = json?.data?.expiresAt
      ? new Date(json.data.expiresAt).getTime()
      : Date.now() + 55 * 60_000; // default: 55 minutes

    this.cache = { token, expiresAt };
    return token;
  }
}

export class RaceHooksAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RaceHooksAuthError";
  }
}

export class RaceHooksAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = "RaceHooksAPIError";
  }
}
