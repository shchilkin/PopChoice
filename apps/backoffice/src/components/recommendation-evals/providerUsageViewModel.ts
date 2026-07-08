export type ProviderUsageAmount = {
  currency: string;
  value: number;
};

export type ProviderUsageViewModel = {
  attribution: string;
  cost: ProviderUsageAmount | null;
  inputTokens: number;
  outputTokens: number;
  requests: number;
};

export function formatProviderUsageCost(value: ProviderUsageAmount | null): string {
  if (!value) return '-';
  if (!Number.isFinite(value.value)) return '-';

  try {
    return new Intl.NumberFormat('en-US', {
      currency: value.currency.toUpperCase(),
      maximumFractionDigits: value.value < 1 ? 4 : 2,
      minimumFractionDigits: 2,
      style: 'currency',
    }).format(value.value);
  } catch {
    return '-';
  }
}

export function formatProviderUsageNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function providerUsageViewFromReport(
  report: Record<string, unknown>,
): ProviderUsageViewModel | null {
  const providerUsage = recordFrom(report.providerUsage);
  if (!providerUsage) return null;

  const observedTotal = recordFrom(recordFrom(providerUsage.observed)?.total);
  const admin = recordFrom(providerUsage.admin);
  const totalCost = recordFrom(recordFrom(recordFrom(admin?.summary)?.costs)?.total);

  return {
    attribution: attributionFromAdmin(admin),
    cost: amountFromRecord(totalCost),
    inputTokens: numberFromRecord(observedTotal, 'inputTokens'),
    outputTokens: numberFromRecord(observedTotal, 'outputTokens'),
    requests: numberFromRecord(observedTotal, 'requests'),
  };
}

export function providerUsageText(view: ProviderUsageViewModel | null): string {
  if (!view) return '-';
  return `${formatProviderUsageNumber(view.requests)} req, ${formatProviderUsageNumber(
    view.inputTokens,
  )} in / ${formatProviderUsageNumber(view.outputTokens)} out`;
}

function amountFromRecord(record: Record<string, unknown> | null): ProviderUsageAmount | null {
  const value = record?.value;
  const currency = record?.currency;
  return typeof value === 'number' && typeof currency === 'string' ? { currency, value } : null;
}

function attributionFromAdmin(admin: Record<string, unknown> | null): string {
  if (typeof admin?.attribution === 'string') return admin.attribution;
  return admin?.status === 'not_configured' ? 'not configured' : 'unavailable';
}

function numberFromRecord(record: Record<string, unknown> | null, key: string): number {
  const value = record?.[key];
  return typeof value === 'number' ? value : 0;
}

function recordFrom(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
