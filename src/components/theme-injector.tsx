"use client";

import { clinicConfig } from "../../config/clinic.config";

/**
 * Injects clinic brand colors as CSS custom properties on :root.
 * This lets globals.css reference them, and the entire UI adapts
 * when you change config/clinic.config.ts.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Derive a lighter variant of a hex color for dark-mode primary.
 * Increases lightness by ~15%.
 */
function lighten(hex: string, amount = 15): string {
  const { h, s, l } = hexToHsl(hex);
  const nl = Math.min(100, l + amount);
  return hslToHex(h, s, nl);
}

function darken(hex: string, amount = 20): string {
  const { h, s, l } = hexToHsl(hex);
  const nl = Math.max(0, l - amount);
  return hslToHex(h, s, nl);
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export default function ThemeInjector() {
  const c = clinicConfig.colors;

  const primaryLight = c.primaryLight || lighten(c.primary);
  const primaryDark = c.primaryDark || darken(c.primary);

  // Build the today-highlight color for the calendar (dark mode)
  const { h, s } = hexToHsl(c.primary);
  const calendarTodayDark = hslToHex(h, Math.round(s * 0.4), 22);

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
:root {
  --clinic-primary: ${c.primary};
  --clinic-primary-light: ${primaryLight};
  --clinic-primary-dark: ${primaryDark};
  --clinic-foreground: ${c.foreground};
  --clinic-accent-tint: ${c.accentTint};
}
:root {
  --primary: ${c.primary};
  --foreground: ${c.foreground};
  --card-foreground: ${c.foreground};
  --secondary-foreground: ${c.foreground};
  --accent: ${c.accentTint};
  --accent-foreground: ${c.primary};
  --ring: ${c.primary};
}
.dark {
  --primary: ${primaryLight};
  --foreground: #f9fafb;
  --card-foreground: #f9fafb;
  --secondary-foreground: #f9fafb;
  --accent: ${primaryDark};
  --accent-foreground: #ffffff;
  --ring: ${primaryLight};
}
.dark .rbc-today {
  background-color: ${calendarTodayDark};
}
.dark .rbc-current-time-indicator {
  background-color: ${primaryLight};
}
`,
      }}
    />
  );
}
