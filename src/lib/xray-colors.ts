// Utilities to apply consistent label colors to detection issues
export type DetectionIssue = {
  id?: string;
  label?: string;
  confidence?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  [key: string]: any;
};

const LABEL_COLORS: Record<string, string> = {
  "healthy teeth": "#22c55e", // green
  caries: "#ef4444", // red
  "dental caries": "#ef4444",
  "caries lesion": "#ef4444",
  "carious lesion": "#ef4444",
  "tooth decay": "#ef4444",
  decay: "#ef4444",
  crown: "#0ea5e9", // sky
  "badly decayed": "#f97316", // orange
  normal: "#22c55e", // green
  rct: "#3b82f6", // blue
  restoration: "#8b5cf6", // purple
  infection: "#f97316", // orange
  "impacted teeth": "#eab308", // amber
  "broken down crow/ root": "#14b8a6", // teal
  "fractured teeth": "#a855f7", // purple
};

const FALLBACK_COLORS = [
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#22c55e",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#94a3b8",
];

const normalizeLabel = (label?: string) => label?.trim().toLowerCase() || "";
const isCariesLabel = (label: string) =>
  label.includes('caries') ||
  label.includes('carious') ||
  label.includes('decay');

export const colorizeIssues = (issues: DetectionIssue[]): DetectionIssue[] => {
  let fallbackIndex = 0;
  return (issues || []).map((issue) => {
    const key = normalizeLabel(issue.label);
    const color =
      (key && isCariesLabel(key) ? '#ef4444' : undefined) ||
      LABEL_COLORS[key] ||
      issue.color ||
      FALLBACK_COLORS[fallbackIndex++ % FALLBACK_COLORS.length];
    return { ...issue, color };
  });
};
