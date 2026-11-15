import type { Card, CardSet } from './types';
import { DEMO_CARDS, DEMO_SETS } from './demo';

const BASE = 'https://api.pokemontcg.io/v2';
let apiKey = '';
export const setApiKey = (k?: string) => { apiKey = k || ''; };
export let offlineMode = false;

async function get<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (apiKey) headers['X-Api-Key'] = apiKey;
  const r = await fetch(BASE + path, { headers });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

const escape = (s: string) => s.replace(/"/g, '\\"');

export interface SearchOpts { name?: string; number?: string; setId?: string; page?: number; pageSize?: number; orderBy?: string }

export async function searchCards(o: SearchOpts): Promise<{ cards: Card[]; total: number }> {
  const q: string[] = [];
  if (o.name?.trim()) q.push(`name:"${escape(o.name.trim())}*"`);
  if (o.number?.trim()) q.push(`number:${o.number.trim().replace(/^0+(?=\d)/, '')}`);
  if (o.setId) q.push(`set.id:${o.setId}`);
  const params = new URLSearchParams({
    q: q.join(' '),
    page: String(o.page ?? 1),
    pageSize: String(o.pageSize ?? 36),
    orderBy: o.orderBy ?? (o.setId ? 'number' : '-set.releaseDate'),
  });
  try {
    const res = await get<{ data: Card[]; totalCount: number }>(`/cards?${params}`);
    offlineMode = false;
    return { cards: res.data, total: res.totalCount };
  } catch {
    offlineMode = true;
    const n = o.name?.toLowerCase().trim();
    const cards = DEMO_CARDS.filter(c =>
      (!n || c.name.toLowerCase().includes(n)) &&
      (!o.number || c.number === o.number.replace(/^0+(?=\d)/, '')) &&
      (!o.setId || c.set.id === o.setId));
    return { cards, total: cards.length };
  }
}

export async function getCard(id: string): Promise<Card | null> {
  try { return (await get<{ data: Card }>(`/cards/${id}`)).data; }
  catch { return DEMO_CARDS.find(c => c.id === id) ?? null; }
}

export async function getSets(): Promise<CardSet[]> {
  try {
    const res = await get<{ data: CardSet[] }>(`/sets?orderBy=-releaseDate&pageSize=250`);
    offlineMode = false;
    return res.data;
  } catch { offlineMode = true; return DEMO_SETS; }
}

/** Refresh prices of many cards in batches using id:(a OR b ...) */
export async function refreshCards(ids: string[]): Promise<Map<string, Card>> {
  const out = new Map<string, Card>();
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 40) {
    const chunk = unique.slice(i, i + 40);
    const q = chunk.map(id => `id:"${id}"`).join(' OR ');
    try {
      const res = await get<{ data: Card[] }>(`/cards?q=${encodeURIComponent(q)}&pageSize=250`);
      res.data.forEach(c => out.set(c.id, c));
    } catch { /* keep old prices */ }
  }
  return out;
}
