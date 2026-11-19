import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card, CardSet, CatalogLang } from '../types';
import type { Store } from '../store';
import { getSetCards, loadFull, searchCards, offlineMode } from '../api';
import { cardPrice, fmt, itemValue } from '../prices';
import { CardTile } from './CardTile';
import { LangPicker } from './LangPicker';

type Owned = 'all' | 'have' | 'missing';
const replaceCard = (full: Card) => (cs: Card[] | null) => cs && cs.map(c => c.id === full.id ? full : c);

export function Search({ store, onOpen, set, clearSet, goSets, lang, setLang }: {
  store: Store; onOpen: (c: Card) => void; set?: CardSet | null; clearSet: () => void; goSets: () => void;
  lang: CatalogLang; setLang: (l: CatalogLang) => void;
}) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [ownedFilter, setOwnedFilter] = useState<Owned>('all');
  const reqId = useRef(0);

  // Whole-set mode: load every card once, filter locally
  const [setCardsAll, setSetCardsAll] = useState<Card[] | null>(null);
  useEffect(() => {
    setSetCardsAll(null); setOwnedFilter('all');
    if (!set) return;
    const id = ++reqId.current;
    setLoading(true); setError(false);
    const signal = { cancelled: false };
    getSetCards(set, lang)
      .then(cs => {
        if (id !== reqId.current) return;
        setSetCardsAll(cs); setOffline(offlineMode); setLoading(false);
        // prices arrive card by card
        loadFull(cs, full => setSetCardsAll(replaceCard(full)), signal);
      })
      .catch(() => { if (id === reqId.current) { setError(true); setLoading(false); } });
    return () => { signal.cancelled = true; };
  }, [set?.id, lang]);

  useEffect(() => {
    if (set) return;
    if (!name.trim() && !number.trim()) { setCards([]); setTotal(0); setError(false); return; }
    const id = ++reqId.current;
    setLoading(true); setError(false);
    const signal = { cancelled: false };
    const t = setTimeout(async () => {
      try {
        const r = await searchCards({ lang, name, number, page, pageSize: 36 });
        if (id !== reqId.current) return;
        setCards(prev => page === 1 ? r.cards : [...prev, ...r.cards]);
        setTotal(r.total); setOffline(offlineMode); setLoading(false);
        loadFull(r.cards, full => setCards(cs => replaceCard(full)(cs) ?? cs), signal);
      } catch { if (id === reqId.current) { setError(true); setLoading(false); } }
    }, 350);
    return () => { clearTimeout(t); signal.cancelled = true; };
  }, [name, number, page, lang, set?.id]);

  useEffect(() => setPage(1), [name, number, lang]);

  const owned = useMemo(() => {
    const m = new Map<string, number>();
    store.items.forEach(i => i.card && m.set(i.card.id, (m.get(i.card.id) ?? 0) + i.quantity));
    return m;
  }, [store.items]);

  const setStats = useMemo(() => {
    if (!set || !setCardsAll) return null;
    const loaded = setCardsAll.filter(c => !c.partial).length;
    const priced = setCardsAll.map(c => cardPrice(c, store.settings)).filter((v): v is number => v != null);
    const have = setCardsAll.filter(c => owned.has(c.id)).length;
    const myValue = store.items.filter(i => i.card?.set.id === set.id && (i.card.lang ?? 'en') === lang).reduce((s, i) => s + itemValue(i, store.settings), 0);
    const missingValue = setCardsAll.filter(c => !owned.has(c.id)).reduce((s, c) => s + (cardPrice(c, store.settings) ?? 0), 0);
    return {
      have, total: setCardsAll.length, myValue, missingValue,
      setValue: priced.reduce((a, b) => a + b, 0), pricedCount: priced.length, loaded,
    };
  }, [set, setCardsAll, owned, store.items, store.settings, lang]);

  const shown = set
    ? (setCardsAll ?? []).filter(c =>
        (ownedFilter === 'all' || (ownedFilter === 'have') === owned.has(c.id)) &&
        (!name.trim() || c.name.toLowerCase().includes(name.trim().toLowerCase())) &&
        (!number.trim() || c.number.replace(/^0+(?=\d)/, '') === number.trim().replace(/^0+(?=\d)/, '')))
    : cards;
  const c = store.settings.currency;

  return (
    <div>
      {set && (
        <div className="set-banner card-surface">
          <img src={set.images.logo} alt={set.name} />
          <div className="grow">
            <b>{set.name}</b><div className="muted small">{[set.series, set.releaseDate, `${set.total} cartas`].filter(Boolean).join(' · ')}</div>
            {setStats && <>
              <div className="progress" role="progressbar" aria-valuenow={setStats.have} aria-valuemax={setStats.total}><div style={{ width: `${setStats.total ? (setStats.have / setStats.total) * 100 : 0}%` }} /></div>
              <div className="muted small">Tienes {setStats.have} de {setStats.total}</div>
            </>}
          </div>
          <button className="btn ghost" onClick={clearSet} aria-label="Cerrar expansión">×</button>
        </div>
      )}
      {set && setStats && (
        <div className="set-stats">
          <div className="stat card-surface"><span>Valor de la expansión</span><b>{setStats.pricedCount ? fmt(setStats.setValue, c) : '—'}</b>
            <small>{setStats.loaded < setStats.total ? `cargando precios… ${setStats.loaded} de ${setStats.total}` : setStats.pricedCount < setStats.total ? `${setStats.pricedCount} de ${setStats.total} cartas con precio` : 'una copia de cada carta'}</small></div>
          <div className="stat card-surface"><span>Lo tuyo en esta expansión</span><b>{fmt(setStats.myValue, c)}</b><small>{setStats.have} cartas distintas</small></div>
          <div className="stat card-surface"><span>Te falta</span><b>{setStats.pricedCount ? fmt(setStats.missingValue, c) : '—'}</b><small>{setStats.total - setStats.have} cartas</small></div>
        </div>
      )}

      <div className="toolbar">
        <input className="search-input" aria-label="Nombre de la carta" placeholder={set ? 'Filtrar esta expansión…' : lang === 'ja' ? 'Nombre (p. ej. ピカチュウ)' : 'Nombre de la carta (p. ej. Charizard)'} value={name} onChange={e => setName(e.target.value)} autoFocus />
        <input className="num-input" aria-label="Número" placeholder="Nº" value={number} onChange={e => setNumber(e.target.value)} />
        {!set && <LangPicker value={lang} onChange={setLang} />}
      </div>
      {set && (
        <div className="chips">
          {([['all', 'Todas'], ['have', 'Las tengo'], ['missing', 'Me faltan']] as const).map(([k, l]) =>
            <button key={k} className={`chip ${ownedFilter === k ? 'on' : ''}`} onClick={() => setOwnedFilter(k)}>{l}</button>)}
        </div>
      )}
      {offline && lang === 'en' && <div className="notice">Sin conexión con el catálogo: mostrando cartas de ejemplo con precios ilustrativos.</div>}
      {error || (offline && lang !== 'en') ? <div className="notice">No se pudo conectar con el catálogo. Revisa tu conexión y vuelve a intentarlo.</div> : null}
      {!set && !name && !number && (
        <div className="empty small-empty muted">Busca por nombre o número, escanea una carta o abre una expansión.<br />
          <button className="btn ghost" onClick={goSets}>Ver expansiones</button></div>
      )}
      {(name || number || set) && !loading && !error && !shown.length && <div className="empty small-empty muted">Ninguna carta coincide.</div>}
      <div className="grid">
        {shown.map(card => <CardTile key={card.id} card={card} settings={store.settings} onClick={() => onOpen(card)} badge={owned.has(card.id) ? `✓ ${owned.get(card.id)}` : undefined} dim={!!set && !owned.has(card.id)} />)}
      </div>
      {loading && <div className="grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="tile skeleton"><div className="tile-img" /><div className="sk-line" /><div className="sk-line short" /></div>)}</div>}
      {!set && !loading && cards.length < total && <button className="btn ghost wide" onClick={() => setPage(p => p + 1)}>Cargar más</button>}
    </div>
  );
}
