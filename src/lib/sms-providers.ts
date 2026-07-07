// @ts-nocheck
/**
 * SMS provider configuration for "درنیکا ساحل" (Dornika Sahel).
 *
 * 8 Iranian SMS providers are supported:
 *
 *   1. kavenegar   — کاوه‌نگار
 *   2. farapayamak — فراپیامک
 *   3. melipayamak — ملی‌پیامک
 *   4. smsir       — اس‌ام‌اس.ir
 *   5. farazsms    — فراز اس‌ام‌اس
 *   6. payamresan  — پیام‌رسان
 *   7. mediana     — مدیانا
 *   8. ghasedak    — قاصدک
 *
 * Each provider implements `sendOtp({ receptor, message, code })`.
 * The active provider is read from the `sms_providers` table; when no
 * provider is active, OTPs are logged to the console (dev mode).
 */

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { smsProviders } from "@/db/schema";

export interface SmsProviderRow {
  id: string;
  slug: string;
  name: string;
  apiKey: string | null;
  senderNumber: string | null;
  isActive: boolean;
  config: Record<string, unknown>;
}

export interface SendOtpInput {
  receptor: string; // phone number, e.g. 09123456789
  code: string; // 6-digit OTP
  message?: string; // optional override
}

export interface SendOtpResult {
  ok: boolean;
  refId?: string;
  error?: string;
  raw?: unknown;
}

export interface SmsProvider {
  slug: string;
  name: string;
  sendOtp(
    row: SmsProviderRow,
    input: SendOtpInput,
  ): Promise<SendOtpResult>;
}

/* ------------------------------------------------------------------ */
/* Default Persian OTP message                                         */
/* ------------------------------------------------------------------ */

export function defaultOtpMessage(code: string): string {
  return `کد تأیید درنیکا ساحل: ${code}\nاین کد تا ۵ دقیقه معتبر است.`;
}

/* ------------------------------------------------------------------ */
/* Provider implementations                                            */
/* ------------------------------------------------------------------ */

const KAVENEGAR: SmsProvider = {
  slug: "kavenegar",
  name: "کاوه‌نگار",
  async sendOtp(row, input) {
    const apiKey = row.apiKey;
    if (!apiKey) return { ok: false, error: "missing api key" };
    const receptor = input.receptor.replace(/^0/, "98");
    const sender = row.senderNumber || "";
    const msg = input.message || defaultOtpMessage(input.code);
    try {
      const res = await fetch(
        `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            receptor,
            message: msg,
            ...(sender ? { sender } : {}),
          }).toString(),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        return?: { status?: number; messageid?: number };
      };
      if (data?.return?.status === 200) {
        return {
          ok: true,
          refId: String(data.return.messageid ?? ""),
          raw: data,
        };
      }
      return { ok: false, error: "kavenegar send failed", raw: data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

const FARAPAYAMAK: SmsProvider = {
  slug: "farapayamak",
  name: "فراپیامک",
  async sendOtp(row, input) {
    const apiKey = row.apiKey;
    if (!apiKey) return { ok: false, error: "missing api key" };
    const username = (row.config?.username as string) || "";
    const password = (row.config?.password as string) || "";
    const from = row.senderNumber || "";
    const msg = input.message || defaultOtpMessage(input.code);
    try {
      const res = await fetch(
        "https://rest.ippanel.com/v1/messages/patterns/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: apiKey,
          },
          body: JSON.stringify({
            from,
            to: input.receptor,
            message: msg,
            username,
            password,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        status?: number;
        bulk_id?: string;
      };
      if (res.ok) {
        return {
          ok: true,
          refId: String(data.bulk_id ?? ""),
          raw: data,
        };
      }
      return { ok: false, error: "farapayamak send failed", raw: data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

const MELIPAYAMAK: SmsProvider = {
  slug: "melipayamak",
  name: "ملی‌پیامک",
  async sendOtp(row, input) {
    const username = (row.config?.username as string) || row.apiKey || "";
    const password = (row.config?.password as string) || "";
    if (!username || !password) return { ok: false, error: "missing creds" };
    const from = row.senderNumber || "";
    const msg = input.message || defaultOtpMessage(input.code);
    try {
      const res = await fetch(
        "https://api.melipayamak.com/api/v1/messages/send/simple",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            from,
            to: input.receptor,
            message: msg,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        status?: string;
      };
      if (res.ok && data?.status !== "error") {
        return { ok: true, refId: String(data?.id ?? ""), raw: data };
      }
      return { ok: false, error: "melipayamak send failed", raw: data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

const SMSIR: SmsProvider = {
  slug: "smsir",
  name: "اس‌ام‌اس.ir",
  async sendOtp(row, input) {
    const apiKey = row.apiKey;
    if (!apiKey) return { ok: false, error: "missing api key" };
    const lineNumber = row.senderNumber || "";
    const msg = input.message || defaultOtpMessage(input.code);
    try {
      const res = await fetch("https://api.sms.ir/v1/send/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          lineNumber,
          messageText: msg,
          mobiles: [input.receptor],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: number;
        data?: { packId?: string };
      };
      if (res.ok) {
        return {
          ok: true,
          refId: String(data?.data?.packId ?? ""),
          raw: data,
        };
      }
      return { ok: false, error: "smsir send failed", raw: data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

const FARAZSMS: SmsProvider = {
  slug: "farazsms",
  name: "فراز اس‌ام‌اس",
  async sendOtp(row, input) {
    const apiKey = row.apiKey;
    if (!apiKey) return { ok: false, error: "missing api key" };
    const from = row.senderNumber || "";
    const msg = input.message || defaultOtpMessage(input.code);
    try {
      const res = await fetch(
        "https://api2.ippanel.com/v1/sms/patterns/send-pattern",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `AccessKey ${apiKey}`,
          },
          body: JSON.stringify({
            from,
            to: input.receptor,
            message: msg,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        status?: number;
        data?: { message_id?: string };
      };
      if (res.ok) {
        return {
          ok: true,
          refId: String(data?.data?.message_id ?? ""),
          raw: data,
        };
      }
      return { ok: false, error: "farazsms send failed", raw: data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

const PAYAMRESAN: SmsProvider = {
  slug: "payamresan",
  name: "پیام‌رسان",
  async sendOtp(row, input) {
    const username = (row.config?.username as string) || row.apiKey || "";
    const password = (row.config?.password as string) || "";
    if (!username || !password) return { ok: false, error: "missing creds" };
    const from = row.senderNumber || "";
    const msg = input.message || defaultOtpMessage(input.code);
    try {
      const res = await fetch("https://api.payam-resan.com/Post/Send.asmx", {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8" },
        body: `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><SendMessage xmlns="http://tempuri.org/"><Username>${username}</Username><Password>${password}</Password><SenderNumber>${from}</SenderNumber><RecipientNumbers>${input.receptor}</RecipientNumbers><Message>${msg}</Message></SendMessage></soap:Body></soap:Envelope>`,
      });
      if (res.ok) return { ok: true, raw: "soap-ok" };
      return { ok: false, error: "payamresan send failed" };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

const MEDIANA: SmsProvider = {
  slug: "mediana",
  name: "مدیانا",
  async sendOtp(row, input) {
    const apiKey = row.apiKey;
    if (!apiKey) return { ok: false, error: "missing api key" };
    const from = row.senderNumber || "";
    const msg = input.message || defaultOtpMessage(input.code);
    try {
      const res = await fetch("https://api.mediana.ir/api/v1/send/sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: input.receptor,
          message: msg,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        status?: string;
      };
      if (res.ok) {
        return { ok: true, refId: String(data?.id ?? ""), raw: data };
      }
      return { ok: false, error: "mediana send failed", raw: data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

const GHASEDAK: SmsProvider = {
  slug: "ghasedak",
  name: "قاصدک",
  async sendOtp(row, input) {
    const apiKey = row.apiKey;
    if (!apiKey) return { ok: false, error: "missing api key" };
    const from = row.senderNumber || "";
    const msg = input.message || defaultOtpMessage(input.code);
    try {
      const res = await fetch("https://api.ghasedak.io/v2/sms/send/simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: apiKey,
        },
        body: new URLSearchParams({
          message: msg,
          receptor: input.receptor,
          ...(from ? { line: from } : {}),
        }).toString(),
      });
      const data = (await res.json().catch(() => ({}))) as {
        result?: { code?: number; message?: string };
      };
      if (res.ok && data?.result?.code === 200) {
        return { ok: true, raw: data };
      }
      return {
        ok: false,
        error: data?.result?.message || "ghasedak send failed",
        raw: data,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const SMS_PROVIDERS: SmsProvider[] = [
  KAVENEGAR,
  FARAPAYAMAK,
  MELIPAYAMAK,
  SMSIR,
  FARAZSMS,
  PAYAMRESAN,
  MEDIANA,
  GHASEDAK,
];

const SMS_BY_SLUG = new Map(SMS_PROVIDERS.map((p) => [p.slug, p]));

export function getSmsProvider(slug: string): SmsProvider | null {
  return SMS_BY_SLUG.get(slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* Active provider from DB                                             */
/* ------------------------------------------------------------------ */

export async function getActiveSmsProviderRow(): Promise<SmsProviderRow | null> {
  try {
    const rows = (await db
      .select()
      .from(smsProviders)
      .where(eq(smsProviders.isActive, true))
      .limit(1)) as SmsProviderRow[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Sends an OTP via the active SMS provider. When no provider is
 * active (or the SEND_OTP env var is "console"), logs to the console
 * instead — useful for development.
 */
export async function sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
  if (process.env.SEND_OTP === "console" || process.env.NODE_ENV !== "production") {
    console.info(`[sms][dev] OTP for ${input.receptor}: ${input.code}`);
    return { ok: true, refId: "dev-console" };
  }

  const row = await getActiveSmsProviderRow();
  if (!row) {
    console.info(`[sms][no-provider] OTP for ${input.receptor}: ${input.code}`);
    return { ok: true, refId: "no-provider" };
  }

  const provider = SMS_BY_SLUG.get(row.slug);
  if (!provider) return { ok: false, error: `unknown provider ${row.slug}` };
  return provider.sendOtp(row, input);
}

/* ------------------------------------------------------------------ */
/* Generic SMS (non-OTP) helper                                        */
/* ------------------------------------------------------------------ */

export interface SendSmsInput {
  /** Phone number, e.g. 09123456789. */
  receptor: string;
  /** Plain text message body. */
  message: string;
}

/**
 * Send a generic (non-OTP) SMS via the active provider. Reuses the
 * provider's `sendOtp` plumbing — each provider's HTTP call already
 * accepts an arbitrary `message` string, so we just pass the caller's
 * message verbatim and supply an empty code (which the default-message
 * path would never reach because `message` is set).
 *
 * Behaviour in dev / no-provider mode mirrors `sendOtp`: logs to the
 * console and returns `ok: true` so callers don't fail in sandboxes.
 */
export async function sendSms(input: SendSmsInput): Promise<SendOtpResult> {
  if (!input?.receptor || !input?.message) {
    return { ok: false, error: "receptor and message are required" };
  }

  if (process.env.SEND_OTP === "console" || process.env.NODE_ENV !== "production") {
    console.info(`[sms][dev] SMS to ${input.receptor}: ${input.message}`);
    return { ok: true, refId: "dev-console" };
  }

  const row = await getActiveSmsProviderRow();
  if (!row) {
    console.info(
      `[sms][no-provider] SMS to ${input.receptor}: ${input.message}`,
    );
    return { ok: true, refId: "no-provider" };
  }

  const provider = SMS_BY_SLUG.get(row.slug);
  if (!provider) return { ok: false, error: `unknown provider ${row.slug}` };

  // Reuse the OTP plumbing — the `message` field takes precedence over
  // the synthesized default, so passing an empty code is safe.
  return provider.sendOtp(row, {
    receptor: input.receptor,
    code: "",
    message: input.message,
  });
}
