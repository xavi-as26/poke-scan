// TCGdex (https://tcgdex.dev) — free, keyless, multi-language Pokémon TCG API.
// Used for every catalogue language except English, which stays on pokemontcg.io.
import type { Card, CardSet, CatalogLang, TcgPrice } from './types';

const BASE = 'https://api.tcgdex.net/v2';

interface TdBrief { id: string; localId: string; name: string; image?: string }
interface TdSetBrief { id: string; name: string; logo?: string; symbol?: string; cardCount?: { total?: number; official?: number } }
interface TdSet extends TdSetBrief { releaseDate?: string; serie?: { id: string; name: string }; cards?: TdBrief[] }
interface TdSerie { id: string; name: string; releaseDate?: string; sets?: TdSetBrief[] }
type TdTcgPrice = { lowPrice?: number; midPrice?: number; highPrice?: number; marketPrice?: number; directLowPrice?: number };
interface TdCard extends TdBrief {
  rarity?: string; illustrator?: string; category?: string; hp?: number; types?: string[];
  set: TdSetBrief;
  variants?: { normal?: boolean; reverse?: boolean; holo?: boolean; firstEdition?: boolean };
  pricing?: {
    cardmarket?: Record<string, number | string | null> | null;
    tcgplayer?: Record<string, TdTcgPrice | string | null> | null;
  };
}

async function get<T>(lang: CatalogLang, path: string): Promise<T> {
  const r = await fetch(`${BASE}/${lang}${path}`);
  if (!r.ok) throw new Error(`TCGdex ${r.status}`);
  return r.json();
}

export const tdId = (lang: CatalogLang, id: string) => `${lang}:${id}`;
export const isTdId = (id: string) => /^[a-z]{2}:/.test(id);
const splitTdId = (id: string) => ({ lang: id.slice(0, 2) as CatalogLang, id: id.slice(3) });

const img = (base?: string) => base
  ? { small: `${base}/low.webp`, large: `${base}/high.webp` }
  : { small: './card-placeholder.svg', large: './card-placeholder.svg' };
const asset = (base?: string) => base ? `${base}.png` : './icon.svg';

// Set metadata cache per language: id -> set
const setCache = new Map<CatalogLang, Promise<Map<string, CardSet>>>();
// TCG Pocket is a digital game: its cards are not physical and have no market prices
const EXCLUDED_SERIES = new Set(['tcgp']);
const excludedSets = new Map<CatalogLang, Set<string>>();

export function tdSets(lang: CatalogLang): Promise<Map<string, CardSet>> {
  let p = setCache.get(lang);
  if (!p) {
    p = (async () => {
      const series = await get<TdSerie[]>(lang, '/series');
      const details = await Promise.all(series.map(s => get<TdSerie>(lang, `/series/${encodeURIComponent(s.id)}`).catch(() => s)));
      const m = new Map<string, CardSet>();
      const skip = new Set<string>();
      // /series is chronological and each series lists its sets in order: use that as the release order
      let rank = 0;
      details.forEach(serie => (serie.sets ?? []).forEach(st => {
        if (EXCLUDED_SERIES.has(serie.id)) { skip.add(st.id); return; }
        m.set(st.id, { ...toSet(st, serie.name, serie.releaseDate), rank: ++rank });
      }));
      excludedSets.set(lang, skip);
      // sets not reachable through a series still appear in /sets
      const all = await get<TdSetBrief[]>(lang, '/sets').catch(() => []);
      all.forEach(st => { if (!m.has(st.id) && !skip.has(st.id)) m.set(st.id, { ...toSet(st, 'Otros'), rank: 0 }); });
      return m;
    })();
    p.catch(() => setCache.delete(lang));
    setCache.set(lang, p);
  }
  return p;
}

function toSet(st: TdSetBrief, series: string, releaseDate?: string): CardSet {
  const total = st.cardCount?.total ?? st.cardCount?.official ?? 0;
  return {
    id: st.id, name: st.name, series, total,
    printedTotal: st.cardCount?.official ?? total,
    releaseDate: (releaseDate ?? '').replace(/-/g, '/'),
    images: { logo: asset(st.logo), symbol: asset(st.symbol) },
  };
}

const unknownSet = (id: string): CardSet =>
  ({ id, name: id, series: '', total: 0, printedTotal: 0, releaseDate: '', images: { logo: './icon.svg', symbol: './icon.svg' } });

function setIdOf(cardId: string) {
  const i = cardId.lastIndexOf('-');
  return i > 0 ? cardId.slice(0, i) : cardId;
}

function briefToCard(b: TdBrief, lang: CatalogLang, sets: Map<string, CardSet>): Card {
  const set = sets.get(setIdOf(b.id)) ?? unknownSet(setIdOf(b.id));
  return { id: tdId(lang, b.id), lang, partial: true, name: b.name, number: b.localId, set, images: img(b.image) };
}

function fullToCard(c: TdCard, lang: CatalogLang, sets: Map<string, CardSet>): Card {
  const set = sets.get(c.set.id) ?? toSet(c.set, '');
  const card: Card = {
    id: tdId(lang, c.id), lang, name: c.name, number: c.localId, rarity: c.rarity && c.rarity !== 'None' ? c.rarity : undefined, artist: c.illustrator,
    supertype: c.category, hp: c.hp?.toString(), types: c.types, set, images: img(c.image),
  };
  const cm = c.pricing?.cardmarket;
  if (cm) {
    const n = (k: string) => (typeof cm[k] === 'number' ? (cm[k] as number) : undefined);
    card.cardmarket = {
      updatedAt: typeof cm.updated === 'string' ? cm.updated : undefined,
      prices: Object.fromEntries(Object.entries({
        trendPrice: n('trend'), averageSellPrice: n('avg'), lowPrice: n('low'),
        avg1: n('avg1'), avg7: n('avg7'), avg30: n('avg30'), reverseHoloTrend: n('trend-holo'),
      }).filter(([, v]) => v != null)) as Record<string, number>,
    };
  }
  const tp = c.pricing?.tcgplayer;
  if (tp) {
    const key: Record<string, string> = { normal: 'normal', holofoil: 'holofoil', 'reverse-holofoil': 'reverseHolofoil', '1st-edition-holofoil': '1stEditionHolofoil', '1st-edition': '1stEditionNormal', 'unlimited-holofoil': 'unlimitedHolofoil' };
    const prices: Record<string, TcgPrice> = {};
    Object.entries(tp).forEach(([k, v]) => {
      if (v && typeof v === 'object' && key[k]) prices[key[k]] = { low: v.lowPrice, mid: v.midPrice, high: v.highPrice, market: v.marketPrice, directLow: v.directLowPrice };
    });
    if (Object.keys(prices).length) card.tcgplayer = { prices };
  }
  return card;
}

export async function tdSearch(lang: CatalogLang, o: { name?: string; number?: string; setId?: string; page?: number; pageSize?: number }) {
  const sets = await tdSets(lang);
  if (o.setId) {
    const st = await get<TdSet>(lang, `/sets/${encodeURIComponent(o.setId)}`);
    let briefs = st.cards ?? [];
    const n = o.name?.trim().toLowerCase();
    if (n) briefs = briefs.filter(b => b.name.toLowerCase().includes(n));
    if (o.number?.trim()) briefs = briefs.filter(b => b.localId.replace(/^0+(?=\d)/, '') === o.number!.trim().replace(/^0+(?=\d)/, ''));
    return { cards: briefs.map(b => briefToCard(b, lang, sets)), total: briefs.length };
  }
  const params = new URLSearchParams({
    'pagination:page': String(o.page ?? 1),
    'pagination:itemsPerPage': String(o.pageSize ?? 36),
  });
  if (o.name?.trim()) params.set('name', o.name.trim());
  if (o.number?.trim()) params.set('localId', o.number.trim());
  const briefs = await get<TdBrief[]>(lang, `/cards?${params}`);
  const skip = excludedSets.get(lang) ?? new Set<string>();
  const cards = briefs
    .filter(b => !skip.has(setIdOf(b.id)))
    .map(b => briefToCard(b, lang, sets))
    .sort((a, b) => (b.set.rank ?? 0) - (a.set.rank ?? 0)); // newest sets first within the page
  // TCGdex does not return a total; assume there is another page when this one is full
  const more = briefs.length === (o.pageSize ?? 36); // compare raw count: filtering may shorten a full page
  return { cards, total: ((o.page ?? 1) - 1) * (o.pageSize ?? 36) + cards.length + (more ? 1 : 0) };
}

export async function tdCard(fullId: string): Promise<Card> {
  const { lang, id } = splitTdId(fullId);
  const [c, sets] = await Promise.all([get<TdCard>(lang, `/cards/${encodeURIComponent(id)}`), tdSets(lang)]);
  return fullToCard(c, lang, sets);
}

export async function tdSetList(lang: CatalogLang): Promise<CardSet[]> {
  const m = await tdSets(lang);
  return [...m.values()].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
}
