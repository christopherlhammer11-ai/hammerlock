/**
 * HammerLock AI — Mobile API Client
 *
 * Connects to the same backend as the desktop app (hammerlockai.com).
 * Handles license validation, chat execution, and credit tracking.
 */

const BASE_URL = __DEV__
  ? "http://localhost:3000"
  : "https://hammerlockai.com";

interface ChatPayload {
  message: string;
  agent?: string;
  model?: string;
  history?: Array<{ role: string; content: string }>;
  persona?: string;
}

interface ChatResponse {
  reply: string;
  model: string;
  creditsUsed?: number;
  creditsRemaining?: number;
}

interface LicenseValidateResponse {
  valid: boolean;
  tier: string;
  email?: string;
  expiresAt?: string;
}

interface HealthResponse {
  status: string;
  version?: string;
}

class HammerLockAPI {
  private licenseKey: string | null = null;

  setLicenseKey(key: string) {
    this.licenseKey = key;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.licenseKey) {
      h["x-license-key"] = this.licenseKey;
    }
    return h;
  }

  /** Check API health */
  async health(): Promise<HealthResponse> {
    const res = await fetch(`${BASE_URL}/api/health`);
    return res.json();
  }

  /** Validate a license key */
  async validateLicense(key: string): Promise<LicenseValidateResponse> {
    const res = await fetch(`${BASE_URL}/api/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) {
      throw new Error(`License validation failed: ${res.status}`);
    }
    return res.json();
  }

  /** Send a chat message and get a response */
  async chat(payload: ChatPayload): Promise<ChatResponse> {
    const res = await fetch(`${BASE_URL}/api/execute`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string }).error || `Chat request failed: ${res.status}`
      );
    }
    return res.json();
  }

  /** Stream a chat response (SSE) */
  async chatStream(
    payload: ChatPayload,
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: Error) => void
  ): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/api/execute`, {
        method: "POST",
        headers: {
          ...this.headers(),
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ ...payload, stream: true }),
      });

      if (!res.ok) {
        throw new Error(`Stream request failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              onDone();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                onToken(parsed.token);
              }
            } catch {
              // Non-JSON line, might be a raw token
              if (data.trim()) {
                onToken(data);
              }
            }
          }
        }
      }
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /** Check credit balance */
  async credits(): Promise<{ used: number; limit: number; remaining: number }> {
    const res = await fetch(`${BASE_URL}/api/credits`, {
      headers: this.headers(),
    });
    return res.json();
  }
}

export const api = new HammerLockAPI();
export type { ChatPayload, ChatResponse, LicenseValidateResponse };
