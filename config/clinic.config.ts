import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color (e.g. #8c62c2)");

export const ClinicConfigSchema = z.object({
  /** Display name of the clinic */
  name: z.string().min(1),
  /** Short tagline / description */
  description: z.string().default(""),
  /** Logo shown in the header & sidebar */
  logo: z.object({
    /** Path or URL to the logo image (header) */
    url: z.string().min(1),
    /** Alt text for the logo */
    alt: z.string().default("Clinic Logo"),
    /** Path or URL to the favicon (browser tab icon) */
    favicon: z.string().default("/favicon.png"),
  }),
  /** Splash screen logo (shown on app load) — falls back to logo.url if omitted */
  splashLogo: z.string().optional(),
  /** Theme colors — drive the entire UI palette */
  colors: z.object({
    /** Primary brand color (buttons, active states, links) */
    primary: ColorSchema,
    /** Lighter primary for dark-mode contexts */
    primaryLight: ColorSchema.optional(),
    /** Darker primary for accent surfaces in dark mode */
    primaryDark: ColorSchema.optional(),
    /** Foreground / body text color in light mode */
    foreground: ColorSchema.default("#373941"),
    /** Accent tint used for subtle highlights (light mode) */
    accentTint: ColorSchema.default("#f3e8ff"),
  }),
  /** Font preferences */
  fonts: z.object({
    /** Primary sans-serif font family */
    sans: z.string().default("'Inter', 'Segoe UI', sans-serif"),
  }).default({ sans: "'Inter', 'Segoe UI', sans-serif" }),
  /** Contact details shown in reports / footers */
  contact: z.object({
    address: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    website: z.string().default(""),
  }).default({ address: "", email: "", phone: "", website: "" }),
  /** Browser / PWA metadata */
  meta: z.object({
    /** Title shown in the browser tab — defaults to clinic name */
    title: z.string().optional(),
    /** PWA theme color */
    themeColor: ColorSchema.default("#0f172a"),
  }).default({ themeColor: "#0f172a" }),
});

export type ClinicConfig = z.infer<typeof ClinicConfigSchema>;

// ---------------------------------------------------------------------------
// Active configuration — edit ONLY this object to rebrand the app
// ---------------------------------------------------------------------------

const raw: z.input<typeof ClinicConfigSchema> = {
  name: process.env.NEXT_PUBLIC_CLINIC_NAME || "Default Clinic",
  description: process.env.NEXT_PUBLIC_CLINIC_DESC || "Dental Management System",

  logo: {
    url: process.env.NEXT_PUBLIC_CLINIC_LOGO_URL || "/favicon.png",
    alt: process.env.NEXT_PUBLIC_CLINIC_LOGO_ALT || "Clinic Logo",
    favicon: process.env.NEXT_PUBLIC_CLINIC_FAVICON || "/favicon.png",
  },
  splashLogo: process.env.NEXT_PUBLIC_CLINIC_SPLASH_LOGO || "",

  colors: {
    primary: process.env.NEXT_PUBLIC_CLINIC_COLOR_PRIMARY || "#3b82f6",
    primaryLight: process.env.NEXT_PUBLIC_CLINIC_COLOR_PRIMARY_LIGHT || "#60a5fa",
    primaryDark: process.env.NEXT_PUBLIC_CLINIC_COLOR_PRIMARY_DARK || "#2563eb",
    foreground: process.env.NEXT_PUBLIC_CLINIC_COLOR_FOREGROUND || "#373941",
    accentTint: process.env.NEXT_PUBLIC_CLINIC_COLOR_ACCENT || "#eff6ff",
  },

  fonts: {
    sans: "'Inter', 'Segoe UI', sans-serif",
  },

  contact: {
    address: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || "",
    email: process.env.NEXT_PUBLIC_CLINIC_EMAIL || "",
    phone: process.env.NEXT_PUBLIC_CLINIC_PHONE || "",
    website: process.env.NEXT_PUBLIC_CLINIC_WEBSITE || "",
  },

  meta: {
    title: process.env.NEXT_PUBLIC_CLINIC_NAME || "Default Clinic",
    themeColor: "#0f172a",
  },
};

// Validate at import-time — a bad config crashes fast, not at runtime
export const clinicConfig: ClinicConfig = ClinicConfigSchema.parse(raw);
