const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, locale?: string): Intl.NumberFormat {
  const key = `${locale ?? "en"}:${currency}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale ?? "en", {
      style: "currency",
      currency,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale?: string,
): string {
  return getFormatter(currency, locale).format(amount);
}

export function formatCurrencyFromMinorUnits(
  amountMinor: number,
  currency: string,
  locale?: string,
): string {
  return formatCurrency(amountMinor / 100, currency, locale);
}
