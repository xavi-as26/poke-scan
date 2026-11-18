import type { Card, CollectionItem, Currency, PriceSource, Settings, Variant } from './types';
import { cachedGraded } from './graded';

// Static conversion used to unify sources; refreshed rates are not needed for a portfolio estimate.
const USD_PER_EUR = 1.08;
export const convert = (v: number, from: Currency, to: Currency) =>
  from === to ? v : from === 'EUR' ? v * USD_PER_EUR : v / USD_PER_EUR;

const CONDITION_FACTOR: Record<string, number> = { M: 1.1, NM: 1, EX: 0.85, GD: 0.7, LP: 0.6, PL: 0.45, PO: 0.3 };

export function variantsOf(card: Card): Variant[] {
  const v = Object.keys(card.tcgplayer?.prices ?? {}) as Variant[];
  return v.length ? v : ['normal'];
}

function tcgMarket(card: Card, variant?: Variant): number | undefined {
  const p = card.tcgplayer?.prices;
  if (!p) return;
  const chosen = (variant && p[variant]) || Object.values(p)[0];
  return chosen?.market ?? chosen?.mid ?? chosen?.low;
}
function cmMarket(card: Card, variant?: Variant): number | undefined {
  const p = card.cardmarket?.prices;
  if (!p) return;
  if (variant === 'reverseHolofoil' && p.reverseHoloTrend) return p.reverseHoloTrend;
  return p.trendPrice || p.averageSellPrice || p.avg7 || p.lowPrice;
}

/** Raw market price for a card in the user's currency. Falls back to the other source. */
export function cardPrice(card: Card | undefined, s: Settings, variant?: Variant): number | undefined {
  if (!card) return;
  const order: [PriceSource, Currency][] = s.source === 'cardmarket'
    ? [['cardmarket', 'EUR'], ['tcgplayer', 'USD']]
    : [['tcgplayer', 'USD'], ['cardmarket', 'EUR']];
  for (const [src, cur] of order) {
    const v = src === 'cardmarket' ? cmMarket(card, variant) : tcgMarket(card, variant);
    if (v != null && v > 0) return convert(v, cur, s.currency);
  }
}

// Rough multipliers for estimating graded values from the raw price when no real graded price is known.
export function gradeMultiplier(grade?: string): number {
  const g = parseFloat(grade ?? '');
  if (isNaN(g)) return 1;
  if (g >= 10) return 4;
  if (g >= 9.5) return 2.5;
  if (g >= 9) return 1.8;
  if (g >= 8) return 1.2;
  return 0.9;
}

export function unitValue(item: CollectionItem, s: Settings): number {
  if (item.manualValue != null) return item.manualValue;
  if (item.kind === 'sealed') return item.purchasePrice ?? 0;
  const raw = cardPrice(item.card, s, item.variant) ?? 0;
  if (item.kind === 'graded') {
    const real = item.card && item.company === 'PSA' ? cachedGraded(item.card.id) : undefined;
    const g = parseFloat(item.grade ?? '');
    const usd = g >= 10 ? real?.psa10 : g === 9 ? real?.psa9 : undefined;
    if (usd != null) return convert(usd, 'USD', s.currency);
    return raw * gradeMultiplier(item.grade);
  }
  return raw * (CONDITION_FACTOR[item.condition ?? 'NM'] ?? 1);
}
export const itemValue = (i: CollectionItem, s: Settings) => unitValue(i, s) * i.quantity;
export const itemCost = (i: CollectionItem) => (i.purchasePrice ?? 0) * i.quantity;

/** Price points for a trend chart, oldest first, from Cardmarket averages. */
export function priceTrend(card: Card, s: Settings): { label: string; value: number }[] {
  const p = card.cardmarket?.prices;
  if (!p) return [];
  const pts: [string, number | undefined][] = [['30d', p.avg30], ['7d', p.avg7], ['1d', p.avg1], ['Hoy', p.trendPrice]];
  return pts.filter(([, v]) => v != null && v > 0).map(([label, v]) => ({ label, value: convert(v!, 'EUR', s.currency) }));
}

export function fmt(v: number | undefined, c: Currency) {
  if (v == null || isNaN(v)) return '—';
  // useGrouping 'always': es-ES leaves 4-digit numbers ungrouped by default ("5613 €")
  return new Intl.NumberFormat(c === 'EUR' ? 'es-ES' : 'en-US', { style: 'currency', currency: c, maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2, useGrouping: 'always' } as unknown as Intl.NumberFormatOptions).format(v);
}
export const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

/** PSA 10 estimate from the raw price, used only when no real graded price is available. */
export const psa10Estimate = (card: Card, s: Settings, variant?: Variant) => {
  const raw = cardPrice(card, s, variant);
  return raw != null ? raw * gradeMultiplier('10') : undefined;
};
