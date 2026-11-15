import { useEffect, useMemo, useState } from 'react';
import type { CardSet } from '../types';
import type { Store } from '../store';
import { getSets } from '../api';

export function Sets({ store, onPick }: { store: Store; onPick: (s: CardSet) => void }) {
  const [sets, setSets] = useState<CardSet[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { getSets().then(setSets); }, []);
  const ownedBySet = useMemo(() => {
    const m = new Map<string, Set<string>>();
    store.items.forEach(i => { if (i.card) { const s = m.get(i.card.set.id) ?? new Set(); s.add(i.card.id); m.set(i.card.set.id, s); } });
    return m;
  }, [store.items]);
  const groups = useMemo(() => {
    const g = new Map<string, CardSet[]>();
    sets.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.series.toLowerCase().includes(q.toLowerCase()))
      .forEach(s => g.set(s.series, [...(g.get(s.series) ?? []), s]));
    return [...g];
  }, [sets, q]);

  return (
    <div>
      <div className="toolbar"><input className="search-input" placeholder="Buscar expansión…" value={q} onChange={e => setQ(e.target.value)} /></div>
      {!sets.length && <div className="loader" />}
      {groups.map(([series, xs]) => (
        <section key={series}>
          <h3>{series}</h3>
          <div className="set-grid">
            {xs.map(s => {
              const have = ownedBySet.get(s.id)?.size ?? 0;
              return (
                <button key={s.id} className="set-tile card-surface" onClick={() => onPick(s)}>
                  <img src={s.images.logo} alt={s.name} loading="lazy" />
                  <div className="set-name">{s.name}</div>
                  <div className="muted small">{have}/{s.total} · {s.releaseDate.slice(0, 4)}</div>
                  <div className="progress"><div style={{ width: `${(have / s.total) * 100}%` }} /></div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
