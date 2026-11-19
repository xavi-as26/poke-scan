// Catalogue access. Every language (English included) comes from TCGdex: free, no key.
// pokemontcg.io is only used to refresh prices of cards saved before the switch (ids without a
// language prefix); its free keys are being retired, so new cards never use it.
import type { Card, CardSet, CatalogLang } from './types';
import { isTdId, tdCard, tdSearch, tdSetList } from './tcgdex';
import { DEMO_CARDS, DEMO_SETS } from './demo';

let legacyKey = '';
export const setApiKey = (k?: string) => { legacyKey = k || ''; };
export let offlineMode = false;

export interface SearchOpts { lang?: CatalogLang; name?: string; number?: string; setId?: string; page?: number; pageSize?: number }

// Short-lived cache: rescanning the same card or paging back should not hit the network again
const searchCache = new Map<string, { at: number; r: { cards: Card[]; total: number } }>();
const SEARCH_TTL = 5 * 60_000;

export async function searchCards(o: SearchOpts): Promise<{ cards: Card[]; total: number }> {
  const key = JSON.stringify([o.lang ?? 'en', o.name?.trim().toLowerCase(), o.number?.trim(), o.setId, o.page, o.pageSize]);
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < SEARCH_TTL) return hit.r;
  try {
    const r = await tdSearch(o.lang ?? 'en', o);
    offlineMode = false;
    searchCache.set(key, { at: Date.now(), r });
    return r;
  } catch {
    offlineMode = true;
    if ((o.lang ?? 'en') !== 'en') return { cards: [], total: 0 };
    const n = o.name?.toLowerCase().trim();
    const cards = DEMO_CARDS.filter(c =>
      (!n || c.name.toLowerCase().includes(n)) &&
      (!o.number || c.number === o.number.replace(/^0+(?=\d)/, '')) &&
      (!o.setId || c.set.id === o.setId));
    return { cards, total: cards.length };
  }
}

// Full card details (prices, rarity), cached for the session
const fullCache = new Map<string, Promise<Card | null>>();

export function getCard(id: string): Promise<Card | null> {
  let p = fullCache.get(id);
  if (!p) {
    p = isTdId(id) ? tdCard(id).catch(() => null) : legacyCard(id);
    p.then(c => { if (!c) fullCache.delete(id); });
    fullCache.set(id, p);
  }
  return p;
}

/** Replace search summaries with full cards (prices), 6 requests at a time, reporting each one. */
export async function loadFull(cards: Card[], onCard: (c: Card, i: number) => void, signal?: { cancelled: boolean }) {
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < cards.length && !signal?.cancelled) {
      const i = next++;
      if (!cards[i].partial) continue;
      const full = await getCard(cards[i].id);
      if (full && !signal?.cancelled) onCard(full, i);
    }
  }));
}

export async function getSets(lang: CatalogLang = 'en'): Promise<CardSet[]> {
  try { const r = await tdSetList(lang); offlineMode = false; return r; }
  catch { offlineMode = true; return lang === 'en' ? DEMO_SETS : []; }
}

/** Every card of a set (summaries; use loadFull for prices). */
export async function getSetCards(set: CardSet, lang: CatalogLang = 'en'): Promise<Card[]> {
  return (await searchCards({ lang, setId: set.id })).cards;
}

/** Refresh prices of saved cards. */
export async function refreshCards(ids: string[]): Promise<Map<string, Card>> {
  const out = new Map<string, Card>();
  const all = [...new Set(ids)];
  for (let i = 0; i < all.length; i += 6) {
    const got = await Promise.all(all.slice(i, i + 6).map(id => {
      fullCache.delete(id);
      return getCard(id);
    }));
    got.forEach(c => c && out.set(c.id, c));
  }
  return out;
}

// ---- Legacy: cards saved with pokemontcg.io ids (e.g. "base1-4") ----
async function legacyCard(id: string): Promise<Card | null> {
  try {
    const r = await fetch(`https://api.pokemontcg.io/v2/cards/${encodeURIComponent(id)}`, { headers: legacyKey ? { 'X-Api-Key': legacyKey } : {} });
    if (!r.ok) throw new Error();
    return (await r.json()).data as Card;
  } catch {
    return DEMO_CARDS.find(c => c.id === id) ?? null;
  }
}
