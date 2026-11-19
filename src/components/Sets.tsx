import { useEffect, useMemo, useState } from 'react';
import type { CardSet, CatalogLang } from '../types';
import { LangPicker } from './LangPicker';
import type { Store } from '../store';
import { getSets } from '../api';

export function Sets({ store, onPick, lang, setLang }: { store: Store; onPick: (s: CardSet) => void; lang: CatalogLang; setLang: (l: CatalogLang) => void }) {
  const [sets, setSets] = useState<CardSet[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); setSets([]); getSets(lang).then(setSets).finally(() => setLoading(false)); }, [lang]);
  const ownedBySet = useMemo(() => {
    const m = new Map<string, Set<string>>();
    store.items.forEach(i => { if (i.card && (i.card.lang ?? 'en') === lang) { const s = m.get(i.card.set.id) ?? new Set(); s.add(i.card.id); m.set(i.card.set.id, s); } });
    return m;
  }, [store.items, lang]);
  const groups = useMemo(() => {
    const g = new Map<string, CardSet[]>();
    sets.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.series.toLowerCase().includes(q.toLowerCase()))
      .forEach(s => g.set(s.series, [...(g.get(s.series) ?? []), s]));
    return [...g];
  }, [sets, q]);

  return (
    <div>
      <div className="toolbar"><input className="search-input" aria-label="Buscar expansión" placeholder="Buscar expansión…" value={q} onChange={e => setQ(e.target.value)} /><LangPicker value={lang} onChange={setLang} /></div>
      {loading && <div className="loader" />}
      {!loading && !sets.length && <div className="notice">No se pudieron cargar las expansiones. Revisa tu conexión.</div>}
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
                  <div className="muted small">{have}/{s.total}{s.releaseDate && ` · ${s.releaseDate.slice(0, 4)}`}</div>
                  <div className="progress"><div style={{ width: `${s.total ? (have / s.total) * 100 : 0}%` }} /></div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
