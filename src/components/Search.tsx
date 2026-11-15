import { useEffect, useRef, useState } from 'react';
import type { Card, CardSet } from '../types';
import type { Store } from '../store';
import { searchCards, offlineMode } from '../api';
import { CardTile } from './CardTile';

export function Search({ store, onOpen, initial, set, clearSet, goSets }: {
  store: Store; onOpen: (c: Card) => void; goSets: () => void; initial?: { name?: string; number?: string; key: number }; set?: CardSet | null; clearSet: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [number, setNumber] = useState(initial?.number ?? '');
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const reqId = useRef(0);

  useEffect(() => { if (initial) { setName(initial.name ?? ''); setNumber(initial.number ?? ''); } }, [initial?.key]);

  useEffect(() => {
    if (!name.trim() && !number.trim() && !set) { setCards([]); setTotal(0); return; }
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchCards({ name, number, setId: set?.id, page, pageSize: 36 });
      if (id !== reqId.current) return;
      setCards(prev => page === 1 ? r.cards : [...prev, ...r.cards]);
      setTotal(r.total); setOffline(offlineMode); setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [name, number, set?.id, page]);

  useEffect(() => setPage(1), [name, number, set?.id]);

  const owned = new Map<string, number>();
  store.items.forEach(i => i.card && owned.set(i.card.id, (owned.get(i.card.id) ?? 0) + i.quantity));
  const ownedInSet = set ? cards.filter(c => owned.has(c.id)).length : 0;

  return (
    <div>
      {set && (
        <div className="set-banner card-surface">
          <img src={set.images.logo} alt={set.name} />
          <div className="grow">
            <b>{set.name}</b><div className="muted small">{set.series} · {set.releaseDate} · {set.total} cartas</div>
            {cards.length > 0 && <div className="progress"><div style={{ width: `${(ownedInSet / set.total) * 100}%` }} /></div>}
            {cards.length > 0 && <div className="muted small">Tienes {ownedInSet} de {set.total} (de las cargadas)</div>}
          </div>
          <button className="btn ghost" onClick={clearSet}>×</button>
        </div>
      )}
      <div className="toolbar">
        <input className="search-input" placeholder="Nombre de la carta (p. ej. Charizard)" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <input className="num-input" placeholder="Nº" value={number} onChange={e => setNumber(e.target.value)} />
      </div>
      {offline && <div className="notice">Sin conexión con la API de Pokémon TCG: mostrando cartas de ejemplo con precios ilustrativos.</div>}
      {!name && !number && !set && <div className="empty small-empty muted">Busca por nombre y/o número, escanea una carta o explora una expansión.<br /><button className="btn ghost" onClick={goSets}>Explorar expansiones</button></div>}
      {(name || number || set) && !loading && !cards.length && <div className="empty small-empty muted">Sin resultados.</div>}
      <div className="grid">
        {cards.map(c => <CardTile key={c.id} card={c} settings={store.settings} onClick={() => onOpen(c)} badge={owned.has(c.id) ? `✓ ${owned.get(c.id)}` : undefined} />)}
      </div>
      {loading && <div className="loader" />}
      {!loading && cards.length < total && <button className="btn ghost wide" onClick={() => setPage(p => p + 1)}>Cargar más ({total - cards.length})</button>}
    </div>
  );
}
