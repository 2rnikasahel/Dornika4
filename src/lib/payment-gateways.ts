/**
 * Payment gateway configuration for "درنیکا ساحل" (Dornika Sahel).
 *
 * Supports three gateways:
 *   - sandbox  : always-succeeds mock gateway for development
 *   - zarinpal : popular Iranian gateway (Rial → Toman conversion)
 *   - zibal    : another popular Iranian gateway
 *
 * Each gateway exposes:
 *   - `createPayment({ amount, description, callbackUrl, mobile, email })`
 *     → `{ authority, gatewayUrl }` on success
 *   - `verifyPayment({ amount, authority })` → `{ refId, status }`
 *
 * Gateway selection: the active gateway is determined by the
 * `PAYMENT_GATEWAY` env var (defaults to `sandbox`). API keys come
 * from `ZARINPAL_MERCHANT_ID` / `ZIBAL_MERCHANT_ID`.
 */

export type GatewaySlug = "sandbox" | "zarinpal" | "zibal";

export interface CreatePaymentInput {
  amount: number; // Rial
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
  amount: number; // Rial
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
  createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult>;
  verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult>;
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
/* Registry + selector                                                 */
/* ------------------------------------------------------------------ */

const REGISTRY: Record<GatewaySlug, PaymentGateway> = {
  sandbox: SANDBOX,
  zarinpal: ZARINPAL,
  zibal: ZIBAL,
};

export function listGateways(): PaymentGateway[] {
  return Object.values(REGISTRY);
}

export function getGateway(slug?: string): PaymentGateway {
  const requested = (slug ||
    process.env.PAYMENT_GATEWAY ||
    "sandbox") as GatewaySlug;
  return REGISTRY[requested] ?? SANDBOX;
}

export function getActiveGatewaySlug(): GatewaySlug {
  return (process.env.PAYMENT_GATEWAY as GatewaySlug) || "sandbox";
}
