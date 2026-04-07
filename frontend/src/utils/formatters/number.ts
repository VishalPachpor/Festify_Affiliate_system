export function formatNumber(
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale ?? "en", options).format(value);
}

export function formatCompact(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale ?? "en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(
  value: number,
  locale?: string,
  decimals = 1,
): string {
  return new Intl.NumberFormat(locale ?? "en", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
