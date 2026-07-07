import {
  pgTable,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Drizzle ORM schema for "درنیکا ساحل" (Dornika Sahel)
 * luxury industrial e-commerce platform.
 *
 * The schema is shared between PostgreSQL (production) and PGlite (sandbox).
 * All tables use text primary keys (cuid-style) to keep IDs portable.
 */

/* ------------------------------------------------------------------ */
/* Admin users                                                        */
/* ------------------------------------------------------------------ */
export const adminUsers = pgTable(
  "admin_users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "super_admin"] })
      .notNull()
      .default("admin"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("admin_users_email_idx").on(t.email),
  }),
);

/* ------------------------------------------------------------------ */
/* Site settings (key/value with locale + group)                      */
/* ------------------------------------------------------------------ */
export const siteSettings = pgTable(
  "site_settings",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    group: text("group").notNull().default("general"),
    locale: text("locale").notNull().default("fa"),
    value: jsonb("value").notNull().default({} as Record<string, unknown>),
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    keyLocaleIdx: uniqueIndex("site_settings_key_locale_idx").on(
      t.key,
      t.locale,
    ),
  }),
);

/* ------------------------------------------------------------------ */
/* Color palettes                                                     */
/* ------------------------------------------------------------------ */
export const colorPalettes = pgTable(
  "color_palettes",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    colors: jsonb("colors").notNull().default({} as Record<string, string>),
    isActive: boolean("is_active").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("color_palettes_slug_idx").on(t.slug),
  }),
);

/* ------------------------------------------------------------------ */
/* Categories (self-referencing parent/child)                         */
/* ------------------------------------------------------------------ */
export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    image: text("image"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("categories_slug_idx").on(t.slug),
    parentIdx: index("categories_parent_id_idx").on(t.parentId),
  }),
);

/* ------------------------------------------------------------------ */
/* Units of measurement                                               */
/* ------------------------------------------------------------------ */
export const units = pgTable(
  "units",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    symbol: text("symbol").notNull(),
    category: text("category").notNull().default("general"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    slugIdx: uniqueIndex("units_slug_idx").on(t.slug),
  }),
);

/* ------------------------------------------------------------------ */
/* Products                                                           */
/* ------------------------------------------------------------------ */
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description"),
    images: jsonb("images").notNull().default([] as string[]),
    coverImage: text("cover_image"),
    isActive: boolean("is_active").notNull().default(true),
    status: text("status", {
      enum: ["draft", "published", "archived"],
    })
      .notNull()
      .default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    metaTitle: text("meta_title"),
    metaDesc: text("meta_desc"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("products_slug_idx").on(t.slug),
    categoryIdx: index("products_category_id_idx").on(t.categoryId),
  }),
);

/* ------------------------------------------------------------------ */
/* Product variants (SKU-level rows with price + stock)               */
/* ------------------------------------------------------------------ */
export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    unitId: text("unit_id").references(() => units.id, {
      onDelete: "set null",
    }),
    sku: text("sku"),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    price: decimal("price", { precision: 18, scale: 2 }).notNull().default("0"),
    unitValue: text("unit_value"),
    stock: integer("stock").notNull().default(0),
    specSheet: jsonb("spec_sheet").notNull().default(
      {} as Record<string, unknown>,
    ),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    skuIdx: uniqueIndex("product_variants_sku_idx").on(t.sku),
    productIdx: index("product_variants_product_id_idx").on(t.productId),
  }),
);

/* ------------------------------------------------------------------ */
/* Carts + cart items (session based)                                 */
/* ------------------------------------------------------------------ */
export const carts = pgTable(
  "carts",
  {
    id: text("id").primaryKey(),
    sessionToken: text("session_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sessionIdx: uniqueIndex("carts_session_token_idx").on(t.sessionToken),
  }),
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),
    quantity: integer("quantity").notNull().default(1),
    priceSnapshot: decimal("price_snapshot", { precision: 18, scale: 2 }),
    productTitleSnapshot: text("product_title_snapshot"),
    variantTitleSnapshot: text("variant_title_snapshot"),
    unitLabelSnapshot: text("unit_label_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    cartIdx: index("cart_items_cart_id_idx").on(t.cartId),
    variantIdx: index("cart_items_variant_id_idx").on(t.variantId),
  }),
);

/* ------------------------------------------------------------------ */
/* Wishlist                                                           */
/* ------------------------------------------------------------------ */
export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: text("id").primaryKey(),
    sessionToken: text("session_token").notNull(),
    productId: text("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sessionProductIdx: uniqueIndex(
      "wishlist_items_session_product_idx",
    ).on(t.sessionToken, t.productId),
  }),
);

/* ------------------------------------------------------------------ */
/* Landing page content                                               */
/* ------------------------------------------------------------------ */
export const landingSlides = pgTable(
  "landing_slides",
  {
    id: text("id").primaryKey(),
    badge: text("badge"),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    ctaText: text("cta_text"),
    ctaHref: text("cta_href"),
    cta2Text: text("cta2_text"),
    cta2Href: text("cta2_href"),
    accentColor: text("accent_color"),
    image: text("image"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const landingFeatures = pgTable(
  "landing_features",
  {
    id: text("id").primaryKey(),
    icon: text("icon").notNull(),
    title: text("title").notNull(),
    desc: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
);

/* ------------------------------------------------------------------ */
/* Customers / B2B users                                              */
/* ------------------------------------------------------------------ */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username"),
    phone: text("phone"),
    email: text("email"),
    name: text("name"),
    passwordHash: text("password_hash"),
    role: text("role", {
      enum: ["customer", "b2b", "admin", "super_admin"],
    })
      .notNull()
      .default("customer"),
    companyName: text("company_name"),
    economicCode: text("economic_code"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    usernameIdx: uniqueIndex("users_username_idx").on(t.username),
    phoneIdx: uniqueIndex("users_phone_idx").on(t.phone),
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  }),
);

export const userAddresses = pgTable(
  "user_addresses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    province: text("province"),
    city: text("city"),
    postalAddress: text("postal_address"),
    postalCode: text("postal_code"),
    receiverName: text("receiver_name"),
    receiverPhone: text("receiver_phone"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("user_addresses_user_id_idx").on(t.userId),
  }),
);

/* ------------------------------------------------------------------ */
/* Orders                                                             */
/* ------------------------------------------------------------------ */
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
    })
      .notNull()
      .default("pending"),
    totalAmount: decimal("total_amount", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    shippingAddress: text("shipping_address"),
    paymentMethod: text("payment_method"),
    paymentRef: text("payment_ref"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderNumberIdx: uniqueIndex("orders_order_number_idx").on(t.orderNumber),
    userIdx: index("orders_user_id_idx").on(t.userId),
  }),
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: text("variant_id"),
    sku: text("sku"),
    productTitle: text("product_title").notNull(),
    variantTitle: text("variant_title"),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: decimal("unit_price", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    lineTotal: decimal("line_total", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
  },
  (t) => ({
    orderIdx: index("order_items_order_id_idx").on(t.orderId),
    variantIdx: index("order_items_variant_id_idx").on(t.variantId),
  }),
);

/* ------------------------------------------------------------------ */
/* Uploaded files                                                     */
/* ------------------------------------------------------------------ */
export const uploadedFiles = pgTable(
  "uploaded_files",
  {
    id: text("id").primaryKey(),
    filename: text("filename").notNull(),
    url: text("url").notNull(),
    mimeType: text("mime_type"),
    size: integer("size").notNull().default(0),
    category: text("category").notNull().default("general"),
    altText: text("alt_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

/* ------------------------------------------------------------------ */
/* Quote requests (lead capture)                                      */
/* ------------------------------------------------------------------ */
export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    company: text("company"),
    message: text("message"),
    status: text("status", {
      enum: ["new", "in_review", "quoted", "rejected", "closed"],
    })
      .notNull()
      .default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

/* ------------------------------------------------------------------ */
/* SMS providers                                                      */
/* ------------------------------------------------------------------ */
export const smsProviders = pgTable(
  "sms_providers",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    apiKey: text("api_key"),
    senderNumber: text("sender_number"),
    isActive: boolean("is_active").notNull().default(false),
    config: jsonb("config").notNull().default({} as Record<string, unknown>),
  },
  (t) => ({
    slugIdx: uniqueIndex("sms_providers_slug_idx").on(t.slug),
  }),
);

/* ------------------------------------------------------------------ */
/* AI price update jobs (bulk admin upload)                           */
/* ------------------------------------------------------------------ */
export const aiPriceUpdateJobs = pgTable(
  "ai_price_update_jobs",
  {
    id: text("id").primaryKey(),
    filename: text("filename").notNull(),
    mode: text("mode").notNull().default("manual"),
    totalRows: integer("total_rows").notNull().default(0),
    matchedRows: integer("matched_rows").notNull().default(0),
    updatedRows: integer("updated_rows").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    report: jsonb("report").notNull().default({} as Record<string, unknown>),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

/* ------------------------------------------------------------------ */
/* OTP codes                                                          */
/* ------------------------------------------------------------------ */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: text("id").primaryKey(),
    channel: text("channel", { enum: ["sms", "email"] })
      .notNull()
      .default("sms"),
    destination: text("destination").notNull(),
    code: text("code"),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    used: boolean("used").notNull().default(false),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    destIdx: index("otp_codes_destination_idx").on(t.destination),
  }),
);

/* ------------------------------------------------------------------ */
/* Chat (AI assistant)                                                */
/* ------------------------------------------------------------------ */
export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: text("id").primaryKey(),
    sessionToken: text("session_token").notNull(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: ["active", "closed", "archived"],
    })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sessionIdx: uniqueIndex("chat_sessions_session_token_idx").on(
      t.sessionToken,
    ),
  }),
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["user", "assistant", "system"],
    }).notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    productMatches: jsonb("product_matches").notNull().default(
      [] as Array<Record<string, unknown>>,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sessionIdx: index("chat_messages_session_id_idx").on(t.sessionId),
  }),
);

/* ------------------------------------------------------------------ */
/* AI providers + feature → provider mapping                          */
/* ------------------------------------------------------------------ */
export const aiProviders = pgTable(
  "ai_providers",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    type: text("type", {
      enum: ["openai", "anthropic", "gemini", "zai", "ollama", "custom"],
    }).notNull(),
    apiKey: text("api_key"),
    apiEndpoint: text("api_endpoint"),
    modelName: text("model_name"),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    config: jsonb("config").notNull().default({} as Record<string, unknown>),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("ai_providers_slug_idx").on(t.slug),
  }),
);

export const aiFeatureProviders = pgTable(
  "ai_feature_providers",
  {
    id: text("id").primaryKey(),
    feature: text("feature").notNull(),
    providerId: text("provider_id")
      .notNull()
      .references(() => aiProviders.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    featureIdx: uniqueIndex("ai_feature_providers_feature_idx").on(t.feature),
  }),
);

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

export type SiteSetting = typeof siteSettings.$inferSelect;
export type ColorPalette = typeof colorPalettes.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type LandingSlide = typeof landingSlides.$inferSelect;
export type LandingFeature = typeof landingFeatures.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserAddress = typeof userAddresses.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type SmsProvider = typeof smsProviders.$inferSelect;
export type AiPriceUpdateJob = typeof aiPriceUpdateJobs.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type AiProvider = typeof aiProviders.$inferSelect;
export type AiFeatureProvider = typeof aiFeatureProviders.$inferSelect;

/* ------------------------------------------------------------------ */
/* Schema map                                                         */
/* ------------------------------------------------------------------ */
export const schema = {
  adminUsers,
  siteSettings,
  colorPalettes,
  categories,
  units,
  products,
  productVariants,
  carts,
  cartItems,
  wishlistItems,
  landingSlides,
  landingFeatures,
  users,
  userAddresses,
  orders,
  orderItems,
  uploadedFiles,
  quoteRequests,
  smsProviders,
  aiPriceUpdateJobs,
  otpCodes,
  chatSessions,
  chatMessages,
  aiProviders,
  aiFeatureProviders,
};

// varchar re-export kept for downstream migrations
export { varchar };
