/**
 * Database layer for "درنیکا ساحل" (Dornika Sahel).
 *
 * Strategy
 * --------
 * 1. Try PostgreSQL first (when `DATABASE_URL` is set and reachable).
 * 2. Fall back to PGlite (WASM Postgres) for sandbox/development.
 *
 * The exported `db` is a **lazy proxy** that records every chained method
 * call (e.g. `db.select().from(x).where(y)`) and only resolves to a real
 * Drizzle client the first time the chain is awaited. Each chained call
 * returns a brand-new proxy with an extended op-list, so concurrent
 * queries never share state.
 *
 * PGlite requires single SQL statements per call, so `splitSqlStatements`
 * is used to break the multi-statement bootstrap DDL string into
 * individual statements before execution.
 */

import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";

import { schema } from "./schema";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type AnyDrizzleClient = ReturnType<
  typeof drizzlePg<typeof schema> | typeof drizzlePglite<typeof schema>
>;

type Op =
  | { type: "get"; prop: string }
  | { type: "call"; args: unknown[] };

/* ------------------------------------------------------------------ */
/* SQL statement splitter                                             */
/* ------------------------------------------------------------------ */

/**
 * Split a multi-statement SQL string into individual statements.
 *
 * Honors:
 *  - single-quoted string literals ('...') with '' escapes
 *  - double-quoted identifiers ("...") with "" escapes
 *  - Postgres dollar-quoted strings ($tag$ ... $tag$)
 *  - line comments (--) and block comments (/* ... *\/)
 *
 * Whitespace-only fragments are skipped.
 */
export function splitSqlStatements(input: string): string[] {
  const out: string[] = [];
  const buf: string[] = [];

  let i = 0;
  const n = input.length;
  let dollarTag: string | null = null;

  const pushBuffer = () => {
    const stmt = buf.join("").trim();
    if (stmt.length > 0) out.push(stmt);
    buf.length = 0;
  };

  while (i < n) {
    const ch = input[i];
    const next = input[i + 1];

    // Inside dollar-quoted string
    if (dollarTag !== null) {
      buf.push(ch);
      if (ch === "$") {
        // Try to match the closing tag
        const endIdx = input.indexOf(`$${dollarTag}$`, i);
        if (endIdx === i) {
          buf.push(input.slice(i + 1, i + 1 + dollarTag.length + 1));
          i += dollarTag.length + 2;
          dollarTag = null;
          continue;
        }
      }
      i += 1;
      continue;
    }

    // Line comment
    if (ch === "-" && next === "-") {
      while (i < n && input[i] !== "\n") {
        buf.push(input[i]);
        i += 1;
      }
      continue;
    }

    // Block comment
    if (ch === "/" && next === "*") {
      buf.push(ch, next);
      i += 2;
      while (i < n && !(input[i] === "*" && input[i + 1] === "/")) {
        buf.push(input[i]);
        i += 1;
      }
      if (i < n) {
        buf.push(input[i], input[i + 1] ?? "");
        i += 2;
      }
      continue;
    }

    // Single-quoted string literal
    if (ch === "'") {
      buf.push(ch);
      i += 1;
      while (i < n) {
        buf.push(input[i]);
        if (input[i] === "'" && input[i + 1] === "'") {
          buf.push(input[i + 1]);
          i += 2;
          continue;
        }
        if (input[i] === "'") {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    // Double-quoted identifier
    if (ch === '"') {
      buf.push(ch);
      i += 1;
      while (i < n) {
        buf.push(input[i]);
        if (input[i] === '"' && input[i + 1] === '"') {
          buf.push(input[i + 1]);
          i += 2;
          continue;
        }
        if (input[i] === '"') {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    // Dollar-quote opener: $tag$
    if (ch === "$") {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(input.slice(i));
      if (m) {
        dollarTag = m[1] ?? "";
        buf.push(m[0]);
        i += m[0].length;
        continue;
      }
    }

    // Statement terminator
    if (ch === ";") {
      pushBuffer();
      i += 1;
      continue;
    }

    buf.push(ch);
    i += 1;
  }

  pushBuffer();
  return out;
}

/* ------------------------------------------------------------------ */
/* Bootstrap DDL                                                      */
/* ------------------------------------------------------------------ */

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS admin_users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users (email);

CREATE TABLE IF NOT EXISTS site_settings (
  id text PRIMARY KEY,
  key text NOT NULL,
  "group" text NOT NULL DEFAULT 'general',
  locale text NOT NULL DEFAULT 'fa',
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_key_locale_idx ON site_settings (key, locale);

CREATE TABLE IF NOT EXISTS color_palettes (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS color_palettes_slug_idx ON color_palettes (slug);

CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  parent_id text,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  image text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_idx ON categories (slug);
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories (parent_id);

CREATE TABLE IF NOT EXISTS units (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  name_en text,
  symbol text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS units_slug_idx ON units (slug);

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  category_id text,
  slug text NOT NULL,
  title text NOT NULL,
  subtitle text,
  description text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_image text,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  meta_title text,
  meta_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_idx ON products (slug);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);

CREATE TABLE IF NOT EXISTS product_variants (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_id text REFERENCES units(id) ON DELETE SET NULL,
  sku text,
  name text NOT NULL,
  name_en text,
  price numeric(18,2) NOT NULL DEFAULT 0,
  unit_value text,
  stock integer NOT NULL DEFAULT 0,
  spec_sheet jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_idx ON product_variants (sku);
CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants (product_id);

CREATE TABLE IF NOT EXISTS carts (
  id text PRIMARY KEY,
  session_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS carts_session_token_idx ON carts (session_token);

CREATE TABLE IF NOT EXISTS cart_items (
  id text PRIMARY KEY,
  cart_id text NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id text REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  price_snapshot numeric(18,2),
  product_title_snapshot text,
  variant_title_snapshot text,
  unit_label_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON cart_items (cart_id);
CREATE INDEX IF NOT EXISTS cart_items_variant_id_idx ON cart_items (variant_id);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id text PRIMARY KEY,
  session_token text NOT NULL,
  product_id text REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS wishlist_items_session_product_idx ON wishlist_items (session_token, product_id);

CREATE TABLE IF NOT EXISTS landing_slides (
  id text PRIMARY KEY,
  badge text,
  title text NOT NULL,
  subtitle text,
  cta_text text,
  cta_href text,
  cta2_text text,
  cta2_href text,
  accent_color text,
  image text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landing_features (
  id text PRIMARY KEY,
  icon text NOT NULL,
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  phone text,
  email text,
  name text,
  password_hash text,
  role text NOT NULL DEFAULT 'customer',
  company_name text,
  economic_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_idx ON users (phone);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS user_addresses (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  province text,
  city text,
  postal_address text,
  postal_code text,
  receiver_name text,
  receiver_phone text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_addresses_user_id_idx ON user_addresses (user_id);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  order_number text NOT NULL,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  shipping_address text,
  payment_method text,
  payment_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx ON orders (order_number);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id text,
  sku text,
  product_title text NOT NULL,
  variant_title text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(18,2) NOT NULL DEFAULT 0,
  line_total numeric(18,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_variant_id_idx ON order_items (variant_id);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id text PRIMARY KEY,
  filename text NOT NULL,
  url text NOT NULL,
  mime_type text,
  size integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_requests (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  company text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sms_providers (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  api_key text,
  sender_number text,
  is_active boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS sms_providers_slug_idx ON sms_providers (slug);

CREATE TABLE IF NOT EXISTS ai_price_update_jobs (
  id text PRIMARY KEY,
  filename text NOT NULL,
  mode text NOT NULL DEFAULT 'manual',
  total_rows integer NOT NULL DEFAULT 0,
  matched_rows integer NOT NULL DEFAULT 0,
  updated_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id text PRIMARY KEY,
  channel text NOT NULL DEFAULT 'sms',
  destination text NOT NULL,
  code text,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_codes_destination_idx ON otp_codes (destination);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id text PRIMARY KEY,
  session_token text NOT NULL,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS chat_sessions_session_token_idx ON chat_sessions (session_token);

CREATE TABLE IF NOT EXISTS chat_messages (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  image_url text,
  product_matches jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages (session_id);

CREATE TABLE IF NOT EXISTS ai_providers (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  api_key text,
  api_endpoint text,
  model_name text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_providers_slug_idx ON ai_providers (slug);

CREATE TABLE IF NOT EXISTS ai_feature_providers (
  id text PRIMARY KEY,
  feature text NOT NULL,
  provider_id text NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_feature_providers_feature_idx ON ai_feature_providers (feature);
`;

const MIGRATION_SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (username);
`;

/* ------------------------------------------------------------------ */
/* Initialization                                                     */
/* ------------------------------------------------------------------ */

let clientPromise: Promise<AnyDrizzleClient> | null = null;
let isPglite = false;

async function tryPostgreSQL(): Promise<AnyDrizzleClient | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (/^(file|sqlite|memory):/i.test(url)) return null;

  // Lazy import so the sandbox doesn't pay this cost when PG isn't available.
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 2000,
    max: 5,
  });

  try {
    // Probe the connection.
    const probe = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("postgres connection timeout")),
          2500,
        ),
      ),
    ]);
    probe.release();

    const client = drizzlePg(pool, { schema });
    // Mark as not pglite
    isPglite = false;
    return client as unknown as AnyDrizzleClient;
  } catch (err) {
    try {
      await pool.end();
    } catch {
      /* ignore */
    }
    console.warn(
      "[db] PostgreSQL unavailable, falling back to PGlite:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

async function initPGlite(): Promise<AnyDrizzleClient> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pglite = await PGlite.create({
    dataDir: "file://memory" /* in-memory */,
  });

  // Apply bootstrap DDL — PGlite requires single statements per call.
  const stmts = splitSqlStatements(BOOTSTRAP_SQL);
  for (const stmt of stmts) {
    await pglite.query(stmt);
  }

  // Apply migrations — these are idempotent.
  for (const stmt of splitSqlStatements(MIGRATION_SQL)) {
    try {
      await pglite.query(stmt);
    } catch (err) {
      // Migrations are best-effort — log and continue.
      console.warn("[db] migration skipped:", err instanceof Error ? err.message : String(err));
    }
  }

  const client = drizzlePglite(pglite, { schema });
  isPglite = true;
  console.info("[db] PGlite initialized (sandbox mode).");
  return client as unknown as AnyDrizzleClient;
}

async function initClient(): Promise<AnyDrizzleClient> {
  const pg = await tryPostgreSQL();
  if (pg) {
    console.info("[db] Connected to PostgreSQL.");
    return pg;
  }
  return await initPGlite();
}

/**
 * Returns the initialized Drizzle client (initializing it on first call).
 * Safe to call multiple times — the same promise is reused.
 */
export async function getDb(): Promise<AnyDrizzleClient> {
  if (!clientPromise) {
    clientPromise = initClient();
  }
  return clientPromise;
}

/**
 * Returns true once the underlying client is PGlite (sandbox mode).
 * Returns false for real PostgreSQL, and `null` before initialization
 * has completed.
 */
export function isUsingPglite(): boolean | null {
  if (!clientPromise) return null;
  return isPglite;
}

/* ------------------------------------------------------------------ */
/* Lazy proxy                                                         */
/* ------------------------------------------------------------------ */

/**
 * Execute a recorded chain of operations against the real client.
 *
 * Operations are NOT awaited individually — intermediate chain calls
 * (e.g. `.select().from(x).where(y)`) return synchronous query builders.
 * Only the final value (a thenable Drizzle builder or a Promise) is
 * returned, and the outer Promise adopts its state automatically.
 */
async function executeOps(ops: Op[]): Promise<unknown> {
  const client = await getDb();
  let current: unknown = client;
  for (const op of ops) {
    if (op.type === "get") {
      current = (current as Record<string, unknown>)[op.prop];
    } else {
      current = (current as (...args: unknown[]) => unknown)(...op.args);
    }
  }
  return current;
}

/**
 * Create a lazy proxy that records `get`/`call` operations and forwards
 * them to the real Drizzle client the first time the chain is awaited.
 *
 * Each chained operation returns a NEW proxy with the extended op-list,
 * so concurrent queries (e.g. multiple `db.select()` calls in flight)
 * never share state.
 */
function createLazyProxy(ops: Op[] = []): unknown {
  const handler: ProxyHandler<() => void> = {
    get(_target, prop) {
      // Ignore well-known symbols used by JS runtime internals.
      if (typeof prop === "symbol") return undefined;

      const propStr = String(prop);

      // Make the proxy thenable — `await db.select()...` triggers executeOps.
      if (propStr === "then") {
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          executeOps(ops).then(resolve, reject);
      }
      if (propStr === "catch") {
        return (reject: (e: unknown) => void) =>
          executeOps(ops).then(undefined, reject);
      }
      if (propStr === "finally") {
        return (cb: () => void) =>
          executeOps(ops).finally(cb) as Promise<unknown>;
      }

      // Avoid breaking on common introspection probes.
      if (
        propStr === "toString" ||
        propStr === "valueOf" ||
        propStr === "toJSON" ||
        propStr === Symbol.toPrimitive.toString()
      ) {
        return () => "[DornikaLazyDb]";
      }

      // Record the property access; the returned proxy is also callable,
      // so it can be either awaited later or invoked as a function.
      return createLazyProxy([...ops, { type: "get", prop: propStr }]);
    },
    apply(_target, _thisArg, argsList) {
      return createLazyProxy([...ops, { type: "call", args: argsList }]);
    },
  };

  // The target is a no-op function so the proxy is callable (apply trap).
  const target = function noop() {} as () => void;
  return new Proxy(target, handler);
}

/**
 * The lazy Drizzle client. Use exactly like a normal Drizzle client:
 *
 *   const rows = await db.select().from(products).where(eq(products.id, "x"));
 *   await db.insert(products).values({ ... });
 *   await db.transaction(async (tx) => { ... });
 */
export const db = createLazyProxy() as AnyDrizzleClient;

/* ------------------------------------------------------------------ */
/* Re-exports                                                         */
/* ------------------------------------------------------------------ */

export * from "./schema";
export { schema };
