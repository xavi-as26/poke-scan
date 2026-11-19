// PSA 10 / PSA 9 prices.
// Real data: PriceCharting API with the user's own token (for cards, "manual-only-price" = PSA 10,
// "graded-price" = grade 9; values in US cents). Without a token we show an estimate from the raw price.
import type { Card } from './types';

export interface GradedPrices {
  psa10?: number; psa9?: number;           // USD
  source: 'pricecharting';
  product?: string; url?: string; at: string;
}

const KEY = 'pokescan.graded';
const MAX_AGE = 3 * 864e5;
type Cache = Record<string, GradedPrices | { none: true; at: string }>;

function readCache(): Cache { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } }
function writeCache(c: Cache) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ } }

/** Last known real graded prices for a card, if any (used for portfolio values). */
export function cachedGraded(id: string): GradedPrices | undefined {
  const v = readCache()[id];
  return v && !('none' in v) ? v : undefined;
}

const inflight = new Map<string, Promise<GradedPrices | null>>();

export class GradedTokenError extends Error { name = 'GradedTokenError'; }

export function fetchGraded(card: Card, token: string): Promise<GradedPrices | null> {
  const cache = readCache();
  const hit = cache[card.id];
  if (hit && Date.now() - Date.parse(hit.at) < MAX_AGE) return Promise.resolve('none' in hit ? null : hit);
  let p = inflight.get(card.id);
  if (!p) {
    p = (async () => {
      const q = ['pokemon', card.name, card.lang === 'ja' ? 'japanese' : '', card.set.name, `#${card.number}`].filter(Boolean).join(' ');
      const r = await fetch(`https://www.pricecharting.com/api/product?t=${encodeURIComponent(token)}&q=${encodeURIComponent(q)}`);
      const d = await r.json().catch(() => ({}));
      if (r.status === 401 || r.status === 403 || /token/i.test(d['error-message'] ?? '')) throw new GradedTokenError('El token de PriceCharting no es válido.');
      const c = readCache();
      if (d.status !== 'success') { c[card.id] = { none: true, at: new Date().toISOString() }; writeCache(c); return null; }
      const cents = (v: unknown) => (typeof v === 'number' && v > 0 ? v / 100 : undefined);
      const g: GradedPrices = {
        psa10: cents(d['manual-only-price']), psa9: cents(d['graded-price']), source: 'pricecharting',
        product: [d['product-name'], d['console-name']].filter(Boolean).join(' · '),
        url: d.id ? `https://www.pricecharting.com/offers?product=${d.id}` : undefined, at: new Date().toISOString(),
      };
      c[card.id] = g; writeCache(c);
      return g;
    })().finally(() => inflight.delete(card.id));
    inflight.set(card.id, p);
  }
  return p;
}
