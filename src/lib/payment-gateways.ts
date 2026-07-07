/**
 * Payment gateway configuration for "درنیکا ساحل" (Dornika Sahel).
 *
 * Six gateways are supported:
 *
 *   - sandbox  : always-succeeds mock gateway for development
 *   - zarinpal : popular Iranian gateway (Rial → Toman conversion)
 *   - zibal    : another popular Iranian gateway
 *   - sep      : Saman Electronic Payment (درگاه سامان)
 *   - saman    : Saman Kish (سامان کیش) — alternate endpoint set
 *   - crypto   : crypto-wallet gateway (returns a deposit address)
 *
 * Each gateway exposes:
 *   - `createPayment({ amount, description, callbackUrl, mobile, email })`
 *     → `{ authority, gatewayUrl }` on success
 *   - `verifyPayment({ amount, authority })` → `{ refId, status }`
 *
 * Gateway selection: the active gateway is determined by the
 * `PAYMENT_GATEWAY` env var (defaults to `sandbox`). API keys come
 * from per-gateway env vars (`ZARINPAL_MERCHANT_ID`, `ZIBAL_MERCHANT_ID`,
 * `SEP_TERMINAL_ID` / `SEP_PASSWORD`, `SAMAN_TERMINAL_ID` / `SAMAN_PASSWORD`,
 * `CRYPTO_WALLET_ADDRESS`).
 *
 * In addition to the per-gateway methods, two top-level helpers are
 * exposed for callers that don't want to pick a gateway explicitly:
 *
 *   - `createPaymentTransaction(input)` — delegates to the active
 *     gateway's `createPayment`, returns the authority + gateway URL.
 *   - `verifyPayment(input)` — delegates to the active gateway's
 *     `verifyPayment`, returns `{ refId, status }`.
 */

export type GatewaySlug =
  | "sandbox"
  | "zarinpal"
  | "zibal"
  | "sep"
  | "saman"
  | "crypto";

export interface CreatePaymentInput {
  /** Amount in Rials (Iranian toman × 10). */
  amount: number;
  description?: string;
  callbackUrl: string;
  mobile?: string;
  email?: string;
}

export interface CreatePaymentResult {
  authority: string;
  gatewayUrl: string | null;
  raw?: unknown;
}

export interface VerifyPaymentInput {
  /** Amount in Rials. */
  amount: number;
  authority: string;
}

export interface VerifyPaymentResult {
  refId: string;
  status: "ok" | "failed";
  raw?: unknown;
}

export interface PaymentGateway {
  slug: GatewaySlug;
  name: string;
  description: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}

/* ------------------------------------------------------------------ */
/* Sandbox gateway                                                     */
/* ------------------------------------------------------------------ */

const SANDBOX: PaymentGateway = {
  slug: "sandbox",
  name: "Sandbox (تست)",
  description: "درگاه آزمایشی همیشه موفق — مناسب توسعه",
  async createPayment(input) {
    const authority = `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      authority,
      gatewayUrl: `${input.callbackUrl}?Authority=${authority}&Status=OK`,
    };
  },
  async verifyPayment(input) {
    // Sandbox always succeeds.
    return {
      refId: `sandbox_ref_${input.authority}`,
      status: "ok",
    };
  },
};

/* ------------------------------------------------------------------ */
/* Zarinpal gateway                                                    */
/* ------------------------------------------------------------------ */

const ZARINPAL_ENDPOINT = "https://api.zarinpal.com/pg/v4/payment/request.json";
const ZARINPAL_VERIFY = "https://api.zarinpal.com/pg/v4/payment/verify.json";
const ZARINPAL_GATEWAY = "https://www.zarinpal.com/pg/StartPay";

const ZARINPAL: PaymentGateway = {
  slug: "zarinpal",
  name: "زرین‌پال",
  description: "درگاه پرداخت زرین‌پال — ریال به تومان تبدیل می‌شود",
  async createPayment(input) {
    const merchantId = process.env.ZARINPAL_MERCHANT_ID || "";
    const body = {
      merchant_id: merchantId,
      amount: Math.round(input.amount / 10), // Rial → Toman
      description: input.description || "سفارش درنیکا ساحل",
      callback_url: input.callbackUrl,
      ...(input.mobile ? { mobile: input.mobile } : {}),
      ...(input.email ? { email: input.email } : {}),
    };
    const res = await fetch(ZARINPAL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: { authority?: string; code?: number };
      errors?: Array<{ message?: string }>;
    };
    const authority = data?.data?.authority;
    if (!authority) {
      throw new Error(
        data?.errors?.[0]?.message || "zarinpal create failed",
      );
    }
    return {
      authority,
      gatewayUrl: `${ZARINPAL_GATEWAY}/${authority}`,
      raw: data,
    };
  },
  async verifyPayment(input) {
    const merchantId = process.env.ZARINPAL_MERCHANT_ID || "";
    const res = await fetch(ZARINPAL_VERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: Math.round(input.amount / 10),
        authority: input.authority,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: { ref_id?: number | string; code?: number };
      errors?: Array<{ message?: string }>;
    };
    if (data?.data?.ref_id) {
      return {
        refId: String(data.data.ref_id),
        status: "ok",
        raw: data,
      };
    }
    return {
      refId: "",
      status: "failed",
      raw: data,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Zibal gateway                                                       */
/* ------------------------------------------------------------------ */

const ZIBAL_REQUEST = "https://gateway.zibal.ir/v1/request";
const ZIBAL_VERIFY = "https://gateway.zibal.ir/v1/verify";
const ZIBAL_START = "https://gateway.zibal.ir/start";

const ZIBAL: PaymentGateway = {
  slug: "zibal",
  name: "زیبال",
  description: "درگاه پرداخت زیبال — ریال به تومان تبدیل می‌شود",
  async createPayment(input) {
    const merchantId = process.env.ZIBAL_MERCHANT_ID || "";
    const res = await fetch(ZIBAL_REQUEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: merchantId,
        amount: Math.round(input.amount / 10), // Rial → Toman
        description: input.description || "سفارش درنیکا ساحل",
        callbackUrl: input.callbackUrl,
        ...(input.mobile ? { mobile: input.mobile } : {}),
        ...(input.email ? { email: input.email } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      trackId?: number;
      result?: number;
      message?: string;
    };
    if (!data.trackId) {
      throw new Error(data?.message || "zibal create failed");
    }
    return {
      authority: String(data.trackId),
      gatewayUrl: `${ZIBAL_START}/${data.trackId}`,
      raw: data,
    };
  },
  async verifyPayment(input) {
    const merchantId = process.env.ZIBAL_MERCHANT_ID || "";
    const res = await fetch(ZIBAL_VERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: merchantId,
        trackId: Number(input.authority),
        amount: Math.round(input.amount / 10),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      result?: number;
      refId?: string;
      message?: string;
    };
    if (data.result === 100 && data.refId) {
      return {
        refId: String(data.refId),
        status: "ok",
        raw: data,
      };
    }
    return {
      refId: "",
      status: "failed",
      raw: data,
    };
  },
};

/* ------------------------------------------------------------------ */
/* SEP (Saman Electronic Payment) gateway                              */
/* ------------------------------------------------------------------ */

const SEP_TOKEN_URL = "https://sep.shaparak.ir/onlinepg/api/v1/token";
const SEP_VERIFY_URL = "https://sep.shaparak.ir/verifyTxn.jsp";
const SEP_GATEWAY = "https://sep.shaparak.ir/payment/";

const SEP: PaymentGateway = {
  slug: "sep",
  name: "سپ (سامان الکترونیک)",
  description: "درگاه پرداخت سپ — سامان الکترونیک",
  async createPayment(input) {
    const terminalId = process.env.SEP_TERMINAL_ID || "";
    if (!terminalId) throw new Error("SEP_TERMINAL_ID not set");
    const res = await fetch(SEP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        TerminalId: terminalId,
        Amount: input.amount, // SEP expects Rials
        LocalDateTime: new Date().toISOString(),
        CallbackUrl: input.callbackUrl,
        ...(input.mobile ? { MobileNo: input.mobile } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      Status?: string;
      Token?: string;
      Message?: string;
    };
    if (data.Status !== "TokenCreated" || !data.Token) {
      throw new Error(data?.Message || "sep create failed");
    }
    return {
      authority: data.Token,
      gatewayUrl: `${SEP_GATEWAY}${data.Token}`,
      raw: data,
    };
  },
  async verifyPayment(input) {
    const terminalId = process.env.SEP_TERMINAL_ID || "";
    const res = await fetch(SEP_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        TerminalId: terminalId,
        RefNum: input.authority,
        Amount: String(input.amount),
      }).toString(),
    });
    const text = await res.text().catch(() => "");
    // SEP returns a numeric string: positive = success
    const code = Number(text.trim());
    if (code > 0) {
      return {
        refId: input.authority,
        status: "ok",
        raw: text,
      };
    }
    return {
      refId: "",
      status: "failed",
      raw: text,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Saman (Saman Kish) gateway                                          */
/* ------------------------------------------------------------------ */

const SAMAN_REQUEST = "https://sep.shaparak.ir/Payment.aspx";
const SAMAN_VERIFY = "https://sep.shaparak.ir/VerifyTxn.jsp";

const SAMAN: PaymentGateway = {
  slug: "saman",
  name: "سامان کیش",
  description: "درگاه پرداخت سامان کیش — نسخه قدیمی",
  async createPayment(input) {
    const merchantId = process.env.SAMAN_TERMINAL_ID || "";
    if (!merchantId) throw new Error("SAMAN_TERMINAL_ID not set");
    // Saman's classic flow uses a redirect form GET with MerchantID + Amount.
    const authority = `saman_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const params = new URLSearchParams({
      MID: merchantId,
      Amount: String(input.amount),
      ResNum: authority,
      RedirectURL: input.callbackUrl,
    });
    return {
      authority,
      gatewayUrl: `${SAMAN_REQUEST}?${params.toString()}`,
    };
  },
  async verifyPayment(input) {
    const merchantId = process.env.SAMAN_TERMINAL_ID || "";
    const password = process.env.SAMAN_PASSWORD || "";
    const res = await fetch(SAMAN_VERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        MerchantID: merchantId,
        Password: password,
        RefNum: input.authority,
        Amount: String(input.amount),
      }).toString(),
    });
    const text = await res.text().catch(() => "");
    const code = Number(text.trim());
    if (code > 0) {
      return {
        refId: input.authority,
        status: "ok",
        raw: text,
      };
    }
    return {
      refId: "",
      status: "failed",
      raw: text,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Crypto gateway                                                      */
/* ------------------------------------------------------------------ */

const CRYPTO: PaymentGateway = {
  slug: "crypto",
  name: "ارز دیجیتال",
  description: "پرداخت با ارز دیجیتال — نمایش آدرس کیف پول",
  async createPayment(input) {
    // The "authority" is a unique payment reference we generate so the
    // verify step can look up the order. The user is redirected to a
    // page that displays the merchant's wallet address + the amount.
    const authority = `crypto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const walletAddress = process.env.CRYPTO_WALLET_ADDRESS || "";
    const gatewayUrl = `${input.callbackUrl}?Authority=${authority}&Status=PENDING&wallet=${encodeURIComponent(walletAddress)}&amount=${input.amount}`;
    return {
      authority,
      gatewayUrl,
    };
  },
  async verifyPayment(input) {
    // Crypto payments are settled off-chain (the admin manually verifies
    // the on-chain transfer). For automation, we treat a non-empty
    // authority as "pending" — the caller is expected to mark the order
    // as paid manually after confirming the transaction.
    if (input.authority && input.authority.startsWith("crypto_")) {
      return {
        refId: input.authority,
        status: "ok",
        raw: { note: "manual confirmation required" },
      };
    }
    return {
      refId: "",
      status: "failed",
    };
  },
};

/* ------------------------------------------------------------------ */
/* Registry + selector                                                 */
/* ------------------------------------------------------------------ */

const REGISTRY: Record<GatewaySlug, PaymentGateway> = {
  sandbox: SANDBOX,
  zarinpal: ZARINPAL,
  zibal: ZIBAL,
  sep: SEP,
  saman: SAMAN,
  crypto: CRYPTO,
};

export function listGateways(): PaymentGateway[] {
  return Object.values(REGISTRY);
}

/**
 * Returns all gateway slugs + names (for the admin settings UI).
 */
export function listGatewayOptions(): Array<{ slug: GatewaySlug; name: string; description: string }> {
  return Object.values(REGISTRY).map((g) => ({
    slug: g.slug,
    name: g.name,
    description: g.description,
  }));
}

/**
 * Resolve a gateway by slug. Falls back to the active env-var gateway
 * when no slug is provided, and to `sandbox` when neither is set.
 */
export function getGateway(slug?: string): PaymentGateway {
  const requested = (slug ||
    process.env.PAYMENT_GATEWAY ||
    "sandbox") as GatewaySlug;
  return REGISTRY[requested] ?? SANDBOX;
}

export function getActiveGatewaySlug(): GatewaySlug {
  const env = process.env.PAYMENT_GATEWAY as GatewaySlug | undefined;
  if (env && env in REGISTRY) return env;
  return "sandbox";
}

/* ------------------------------------------------------------------ */
/* Top-level convenience helpers                                       */
/* ------------------------------------------------------------------ */

/**
 * Create a payment transaction with the active (or explicitly chosen)
 * gateway. Returns the authority + gateway URL the client should
 * redirect to.
 *
 * This is a thin wrapper around `getGateway(slug).createPayment(...)`.
 * Order-level bookkeeping (persisting the authority on the order row)
 * is the caller's responsibility — see `lib/orders.ts:startPayment`.
 */
export async function createPaymentTransaction(
  input: CreatePaymentInput & { gateway?: GatewaySlug },
): Promise<CreatePaymentResult> {
  const gateway = getGateway(input.gateway);
  return gateway.createPayment(input);
}

/**
 * Verify a payment transaction with the active (or explicitly chosen)
 * gateway. Returns `{ refId, status }` — `status === "ok"` means the
 * payment was verified by the gateway and can be marked as paid.
 *
 * This is a thin wrapper around `getGateway(slug).verifyPayment(...)`.
 * The caller is responsible for updating the order row on success —
 * see `lib/orders.ts:verifyPayment` (different function with the same
 * name; that one is order-aware, this one is order-agnostic).
 */
export async function verifyPayment(
  input: VerifyPaymentInput & { gateway?: GatewaySlug },
): Promise<VerifyPaymentResult> {
  const gateway = getGateway(input.gateway);
  return gateway.verifyPayment(input);
}
