export * from "./schema";
export { schema } from "./schema";

import { drizzle } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
type AnyDb = ReturnType<typeof drizzle> | ReturnType<typeof drizzlePg>;

/* ------------------------------------------------------------------ */
/* Global cache                                                       */
/* ------------------------------------------------------------------ */
const g = globalThis as typeof globalThis & {
  __dornikaDb?: AnyDb;
  __dornikaPglite?: any;
  __dornikaPgPoolFailed?: boolean;
};

/* ------------------------------------------------------------------ */
/* Bootstrap SQL (PGlite)                                             */
/* ------------------------------------------------------------------ */
function splitSql(sql: string): string[] {
  const stmts: string[] = [];
  let cur = "", inS = false, inD = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inD) inS = !inS;
    else if (ch === '"' && !inS) inD = !inD;
    if (ch === ";" && !inS && !inD) {
      const s = cur.trim();
      if (s) stmts.push(s);
      cur = "";
    } else cur += ch;
  }
  const t = cur.trim();
  if (t) stmts.push(t);
  return stmts;
}

const BOOTSTRAP_SQL = [
  `CREATE TABLE IF NOT EXISTS admin_users (id SERIAL PRIMARY KEY, name VARCHAR(160) NOT NULL, email VARCHAR(200) NOT NULL, password_hash TEXT NOT NULL, role VARCHAR(40) NOT NULL DEFAULT 'admin', is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users(email)`,
  `CREATE TABLE IF NOT EXISTS site_settings (id SERIAL PRIMARY KEY, key VARCHAR(120) NOT NULL, "group" VARCHAR(80) NOT NULL DEFAULT 'general', locale VARCHAR(5) NOT NULL DEFAULT 'fa', value JSONB NOT NULL, description TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS site_settings_key_locale_idx ON site_settings(key, locale)`,
  `CREATE TABLE IF NOT EXISTS color_palettes (id SERIAL PRIMARY KEY, slug VARCHAR(80) NOT NULL, name VARCHAR(120) NOT NULL, colors JSONB NOT NULL, is_active BOOLEAN NOT NULL DEFAULT FALSE, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS color_palettes_slug_idx ON color_palettes(slug)`,
  `CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, parent_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT, slug VARCHAR(120) NOT NULL, title VARCHAR(200) NOT NULL, description TEXT, image VARCHAR(500), sort_order INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_idx ON categories(slug)`,
  `CREATE TABLE IF NOT EXISTS units (id SERIAL PRIMARY KEY, slug VARCHAR(60) NOT NULL, name VARCHAR(100) NOT NULL, name_en VARCHAR(100), symbol VARCHAR(20), category VARCHAR(60) NOT NULL DEFAULT 'general', is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INTEGER NOT NULL DEFAULT 0)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS units_slug_idx ON units(slug)`,
  `CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT, slug VARCHAR(200) NOT NULL, title VARCHAR(300) NOT NULL, subtitle VARCHAR(300), description TEXT, images JSONB NOT NULL DEFAULT '[]', cover_image VARCHAR(500), is_active BOOLEAN NOT NULL DEFAULT TRUE, status VARCHAR(20) NOT NULL DEFAULT 'active', sort_order INTEGER NOT NULL DEFAULT 0, meta_title VARCHAR(300), meta_desc TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS products_slug_idx ON products(slug)`,
  `CREATE TABLE IF NOT EXISTS product_variants (id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL, sku VARCHAR(100), name VARCHAR(200) NOT NULL, name_en VARCHAR(200), price NUMERIC(18,2) NOT NULL DEFAULT 0, unit_value VARCHAR(60), stock INTEGER NOT NULL DEFAULT 0, spec_sheet JSONB DEFAULT '{}', is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_idx ON product_variants(sku)`,
  `CREATE TABLE IF NOT EXISTS carts (id SERIAL PRIMARY KEY, session_token VARCHAR(80) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS carts_session_token_idx ON carts(session_token)`,
  `CREATE TABLE IF NOT EXISTS cart_items (id SERIAL PRIMARY KEY, cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE, variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT, quantity INTEGER NOT NULL DEFAULT 1, price_snapshot NUMERIC(18,2) NOT NULL DEFAULT 0, product_title_snapshot VARCHAR(300) NOT NULL, variant_title_snapshot VARCHAR(200) NOT NULL, unit_label_snapshot VARCHAR(80), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS cart_items_cart_variant_idx ON cart_items(cart_id, variant_id)`,
  `CREATE TABLE IF NOT EXISTS wishlist_items (id SERIAL PRIMARY KEY, session_token VARCHAR(80) NOT NULL, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS wishlist_session_product_idx ON wishlist_items(session_token, product_id)`,
  `CREATE TABLE IF NOT EXISTS landing_slides (id SERIAL PRIMARY KEY, badge VARCHAR(200), title VARCHAR(300) NOT NULL, subtitle TEXT, cta_text VARCHAR(120), cta_href VARCHAR(300), cta2_text VARCHAR(120), cta2_href VARCHAR(300), accent_color VARCHAR(20), image VARCHAR(500), is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS landing_features (id SERIAL PRIMARY KEY, icon VARCHAR(60) NOT NULL DEFAULT 'ShieldCheck', title VARCHAR(200) NOT NULL, "desc" TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(80), phone VARCHAR(30), email VARCHAR(200), name VARCHAR(160) NOT NULL, password_hash TEXT NOT NULL, role VARCHAR(40) NOT NULL DEFAULT 'customer', company_name VARCHAR(200), economic_code VARCHAR(80), is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_phone_idx ON users(phone)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email)`,
  `CREATE TABLE IF NOT EXISTS user_addresses (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(100) NOT NULL, province VARCHAR(100) NOT NULL, city VARCHAR(100) NOT NULL, postal_address TEXT NOT NULL, postal_code VARCHAR(20), receiver_name VARCHAR(160), receiver_phone VARCHAR(30), is_default BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, order_number VARCHAR(60) NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT, status VARCHAR(60) NOT NULL DEFAULT 'pending_payment', total_amount NUMERIC(18,2) NOT NULL DEFAULT 0, shipping_address TEXT NOT NULL, payment_method VARCHAR(80) DEFAULT 'zarinpal', payment_ref VARCHAR(120), notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx ON orders(order_number)`,
  `CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL, sku VARCHAR(100) NOT NULL, product_title VARCHAR(300) NOT NULL, variant_title VARCHAR(200) NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, unit_price NUMERIC(18,2) NOT NULL DEFAULT 0, line_total NUMERIC(18,2) NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS uploaded_files (id SERIAL PRIMARY KEY, filename VARCHAR(255) NOT NULL, url VARCHAR(500) NOT NULL, mime_type VARCHAR(100) NOT NULL, size INTEGER NOT NULL, category VARCHAR(40) NOT NULL DEFAULT 'general', alt_text VARCHAR(255), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS quote_requests (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, name VARCHAR(160) NOT NULL, phone VARCHAR(30) NOT NULL, email VARCHAR(200), company VARCHAR(200), message TEXT NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'new', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS sms_providers (id SERIAL PRIMARY KEY, slug VARCHAR(40) NOT NULL, name VARCHAR(100) NOT NULL, api_key TEXT, sender_number VARCHAR(40), is_active BOOLEAN NOT NULL DEFAULT FALSE, config JSONB DEFAULT '{}')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sms_providers_slug_idx ON sms_providers(slug)`,
  `CREATE TABLE IF NOT EXISTS ai_price_update_jobs (id SERIAL PRIMARY KEY, filename VARCHAR(255) NOT NULL, mode VARCHAR(20) NOT NULL DEFAULT 'dry_run', total_rows INTEGER NOT NULL DEFAULT 0, matched_rows INTEGER NOT NULL DEFAULT 0, updated_rows INTEGER NOT NULL DEFAULT 0, error_rows INTEGER NOT NULL DEFAULT 0, report JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS otp_codes (id SERIAL PRIMARY KEY, channel VARCHAR(10) NOT NULL, destination VARCHAR(200) NOT NULL, code VARCHAR(10) NOT NULL, code_hash TEXT, expires_at TIMESTAMPTZ NOT NULL, used BOOLEAN NOT NULL DEFAULT FALSE, attempts INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS otp_codes_destination_idx ON otp_codes(destination, channel)`,
  `CREATE TABLE IF NOT EXISTS chat_sessions (id SERIAL PRIMARY KEY, session_token VARCHAR(80) NOT NULL, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS chat_sessions_token_idx ON chat_sessions(session_token)`,
  `CREATE TABLE IF NOT EXISTS chat_messages (id SERIAL PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE, role VARCHAR(20) NOT NULL, content TEXT NOT NULL, image_url TEXT, product_matches JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS ai_providers (id SERIAL PRIMARY KEY, slug VARCHAR(40) NOT NULL, name VARCHAR(100) NOT NULL, type VARCHAR(20) NOT NULL, api_key TEXT, api_endpoint TEXT, model_name VARCHAR(100), is_active BOOLEAN NOT NULL DEFAULT FALSE, is_default BOOLEAN NOT NULL DEFAULT FALSE, config JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ai_providers_slug_idx ON ai_providers(slug)`,
  `CREATE TABLE IF NOT EXISTS ai_feature_providers (id SERIAL PRIMARY KEY, feature VARCHAR(40) NOT NULL, provider_id INTEGER NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ai_feature_providers_feature_idx ON ai_feature_providers(feature)`,
];

async function applySchema(pglite: any) {
  for (const sql of BOOTSTRAP_SQL) {
    for (const stmt of splitSql(sql)) {
      try { await pglite.query(stmt); } catch (e: any) {
        if (process.env.NODE_ENV !== 'production') console.warn('[db] Schema skip:', e.message?.substring(0, 60));
      }
    }
  }
  if (process.env.NODE_ENV !== 'production') console.log('[db] Schema applied');
}

/* ------------------------------------------------------------------ */
/* Initialization                                                     */
/* ------------------------------------------------------------------ */
async function initDb(): Promise<AnyDb> {
  if (g.__dornikaDb) return g.__dornikaDb;

  // Try PostgreSQL first
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !g.__dornikaPgPoolFailed && !dbUrl.startsWith('file:')) {
    try {
      const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 2000 });
      const client = await pool.connect();
      client.release();
      const db = drizzlePg(pool, { schema });
      g.__dornikaDb = db;
      console.log('[db] Connected to PostgreSQL');
      return db;
    } catch (err) {
      g.__dornikaPgPoolFailed = true;
      console.warn('[db] PostgreSQL unreachable, using PGlite');
    }
  }

  // Fall back to PGlite
  const fs = await import('node:fs');
  const dataDir = '/home/z/my-project/pglite-data';
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}

  const { PGlite } = await import('@electric-sql/pglite');
  const pglite = new PGlite({ dataDir });
  g.__dornikaPglite = pglite;

  // Wait for ready and apply schema
  await (pglite as any).ready;
  await applySchema(pglite);

  const db = drizzle(pglite as any, { schema });
  g.__dornikaDb = db;
  console.log('[db] PGlite ready');
  return db;
}

// Start init immediately
void initDb().catch((err) => console.error('[db] Init failed:', err));

/* ------------------------------------------------------------------ */
/* Exports                                                            */
/* ------------------------------------------------------------------ */

// Proxy that records method chains and replays on the real db when awaited
export const db = new Proxy({} as AnyDb, {
  get(_target, prop: string) {
    const chain: { prop: string; args: unknown[] }[] = [];
    const makeThenable = (ops: { prop: string; args: unknown[] }[]): any => {
      const t = {
        then(onF: any, onR: any) {
          return initDb().then((realDb: any) => {
            let cur: unknown = realDb;
            for (const op of ops) {
              const fn = (cur as any)[op.prop];
              cur = typeof fn === 'function' ? fn.apply(cur, op.args) : fn;
            }
            if (cur && typeof (cur as any).then === 'function') return Promise.resolve(cur).then(onF, onR);
            return onF ? onF(cur) : cur;
          }).catch(onR);
        },
        catch(onR: any) { return t.then(undefined, onR); },
      };
      return new Proxy(t, {
        get(_t, p: string) {
          if (p === 'then' || p === 'catch' || p === 'finally') return (t as any)[p];
          return (...args: unknown[]) => makeThenable([...ops, { prop: p, args }]);
        },
      });
    };
    return (...args: unknown[]) => makeThenable([{ prop, args }]);
  },
});

export async function getDb(): Promise<AnyDb> {
  return initDb();
}

export function isUsingPglite(): boolean {
  return !!g.__dornikaPglite;
}
