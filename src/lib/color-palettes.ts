export type ColorPalette = {
  slug: string; name: string; description: string;
  colors: { background: string; surface: string; primary: string; accent: string; text: string; textMuted: string; border: string; };
};

export const luxuryPalettes: ColorPalette[] = [
  { slug: "navy-pearl", name: "سرمه‌ای و صدفی", description: "پالت اصلی درنیکا ساحل", colors: { background: "#f6f2e9", surface: "#ffffff", primary: "#0b2136", accent: "#237d90", text: "#05101d", textMuted: "#6b7280", border: "#0b21361a" } },
  { slug: "deep-ocean", name: "اقیانوس عمیق", description: "آبی نفتی عمیق با سفید صدفی", colors: { background: "#f0f4f8", surface: "#ffffff", primary: "#0d3b45", accent: "#196374", text: "#0a2530", textMuted: "#5a7a8a", border: "#0d3b451a" } },
  { slug: "charcoal-mist", name: "ذغالی و مه", description: "مینیمال و حرفه‌ای", colors: { background: "#f5f5f0", surface: "#ffffff", primary: "#262b36", accent: "#4a5262", text: "#1a1d24", textMuted: "#6b7280", border: "#262b361a" } },
  { slug: "midnight-petrol", name: "نیمه‌شب نفتی", description: "لوکس و مرموز", colors: { background: "#eef2f5", surface: "#ffffff", primary: "#05101d", accent: "#3d9dae", text: "#020812", textMuted: "#5a6b7a", border: "#05101d1a" } },
  { slug: "ivory-slate", name: "عاجی و سنگی", description: "کلاسیک و بی‌زمان", colors: { background: "#faf7f0", surface: "#ffffff", primary: "#2d3142", accent: "#4c6885", text: "#1a1d28", textMuted: "#7a7e8a", border: "#2d31421a" } },
  { slug: "deep-teal", name: "تیل عمیق", description: "مدرن و صنعتی", colors: { background: "#f0f5f4", surface: "#ffffff", primary: "#0a3d3a", accent: "#1a6b65", text: "#04201e", textMuted: "#5a7a75", border: "#0a3d3a1a" } },
  { slug: "graphite-pearl", name: "گرافیتی و صدفی", description: "جدی و حرفه‌ای", colors: { background: "#f4f2ee", surface: "#ffffff", primary: "#1c1f26", accent: "#5a6c7d", text: "#101218", textMuted: "#6b7080", border: "#1c1f261a" } },
  { slug: "storm-steel", name: "طوفان و فولاد", description: "قدرتمند و صنعتی", colors: { background: "#eef0f3", surface: "#ffffff", primary: "#1e2a35", accent: "#3d5566", text: "#0f1820", textMuted: "#5a6b78", border: "#1e2a351a" } },
  { slug: "pearl-petrol", name: "صدفی و نفتی", description: "آرام و دلپذیر", colors: { background: "#f8f4ec", surface: "#ffffff", primary: "#124e5c", accent: "#237d90", text: "#0a2a32", textMuted: "#5a7a82", border: "#124e5c1a" } },
  { slug: "slate-azure", name: "سنگی و آبی", description: "تمیز و مدرن", colors: { background: "#f1f3f6", surface: "#ffffff", primary: "#252e3d", accent: "#3b6e9e", text: "#151a24", textMuted: "#5a6578", border: "#252e3d1a" } },
  { slug: "dark-onyx", name: "اکسایت تیره", description: "فوق مدرن و مینیمال", colors: { background: "#f0f0f0", surface: "#ffffff", primary: "#0a0a0a", accent: "#3a3a3a", text: "#000000", textMuted: "#666666", border: "#0a0a0a1a" } },
  { slug: "navy-gold-muted", name: "سرمه‌ای و طلایی مات", description: "فاخر و شاهانه", colors: { background: "#f5f1e8", surface: "#ffffff", primary: "#0a1a2f", accent: "#8a7445", text: "#050d18", textMuted: "#5a6b7a", border: "#0a1a2f1a" } },
];

export function applyPalette(p: ColorPalette) {
  const r = document.documentElement;
  r.style.setProperty("--color-navy-900", p.colors.primary);
  r.style.setProperty("--color-navy-800", p.colors.primary);
  r.style.setProperty("--color-petrol-600", p.colors.accent);
  r.style.setProperty("--color-petrol-700", p.colors.accent);
  r.style.setProperty("--color-pearl-100", p.colors.background);
  r.style.setProperty("--color-charcoal-500", p.colors.textMuted);
  r.style.setProperty("--color-charcoal-900", p.colors.text);
}
export function getActivePaletteSlug(): string { if (typeof window === "undefined") return "navy-pearl"; return localStorage.getItem("dornika_palette") || "navy-pearl"; }
export function setActivePaletteSlug(slug: string) { if (typeof window !== "undefined") localStorage.setItem("dornika_palette", slug); }
