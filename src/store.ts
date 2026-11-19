import { useEffect, useState, useCallback } from 'react';
import type { Binder, Card, CollectionItem, Settings, ValueSnapshot } from './types';

const K = { items: 'pokescan.items', settings: 'pokescan.settings', history: 'pokescan.history', wishlist: 'pokescan.wishlist', binders: 'pokescan.binders' };

export const BINDER_COLORS = ['var(--accent)', 'var(--accent2)', 'var(--up)', 'var(--down)', 'var(--b5)', 'var(--b6)'];

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function save(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }

function usePersisted<T>(key: string, fallback: T) {
  const [v, setV] = useState<T>(() => load(key, fallback));
  useEffect(() => save(key, v), [key, v]);
  return [v, setV] as const;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function useStore() {
  const [items, setItems] = usePersisted<CollectionItem[]>(K.items, []);
  const [settings, setSettings] = usePersisted<Settings>(K.settings, { currency: 'EUR', source: 'cardmarket' });
  const [history, setHistory] = usePersisted<ValueSnapshot[]>(K.history, []);
  const [wishlist, setWishlist] = usePersisted<Card[]>(K.wishlist, []);

  const [binders, setBinders] = usePersisted<Binder[]>(K.binders, []);
  const addBinder = useCallback((name: string) => {
    const b: Binder = { id: uid(), name: name.trim(), color: BINDER_COLORS[Math.floor(Math.random() * BINDER_COLORS.length)] };
    setBinders(bs => [...bs, b]);
    return b;
  }, [setBinders]);
  const renameBinder = useCallback((id: string, name: string) =>
    setBinders(bs => bs.map(b => b.id === id ? { ...b, name: name.trim() } : b)), [setBinders]);
  const removeBinder = useCallback((id: string) => {
    setBinders(bs => bs.filter(b => b.id !== id));
    setItems(xs => xs.map(x => x.binderId === id ? { ...x, binderId: undefined } : x));
  }, [setBinders, setItems]);

  const add = useCallback((it: Omit<CollectionItem, 'uid' | 'addedAt'>) =>
    setItems(xs => [{ ...it, uid: uid(), addedAt: new Date().toISOString() }, ...xs]), [setItems]);
  const update = useCallback((u: string, patch: Partial<CollectionItem>) =>
    setItems(xs => xs.map(x => x.uid === u ? { ...x, ...patch } : x)), [setItems]);
  const remove = useCallback((u: string) => setItems(xs => xs.filter(x => x.uid !== u)), [setItems]);
  const toggleWish = useCallback((c: Card) =>
    setWishlist(w => w.some(x => x.id === c.id) ? w.filter(x => x.id !== c.id) : [c, ...w]), [setWishlist]);

  /** Record one snapshot per day (the latest value of the day wins). */
  const snapshot = useCallback((value: number, cost: number) => {
    const date = new Date().toISOString().slice(0, 10);
    setHistory(h => {
      const rest = h.filter(x => x.date !== date);
      return [...rest, { date, value, cost }].sort((a, b) => a.date.localeCompare(b.date)).slice(-730);
    });
  }, [setHistory]);

  return { binders, setBinders, addBinder, renameBinder, removeBinder, setWishlist, items, setItems, add, update, remove, settings, setSettings, history, setHistory, snapshot, wishlist, toggleWish };
}
export type Store = ReturnType<typeof useStore>;
