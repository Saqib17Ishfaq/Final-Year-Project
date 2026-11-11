export function formatNumber(value: number) {
  if (Number.isNaN(value)) return "0";
  return value.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}
