import { useMemo, useState } from 'react';
import type { Store } from '../store';
import type { CollectionItem } from '../types';
import { fmt, itemCost, itemValue, pct } from '../prices';
import { CardTile } from './CardTile';
import type { Card } from '../types';

type Filter = 'all' | 'card' | 'graded' | 'sealed' | 'wish';
type Sort = 'value' | 'name' | 'added' | 'gain' | 'set';

export function Collection({ store, onOpen, onOpenCard, onAddSealed }: { store: Store; onOpen: (i: CollectionItem) => void; onOpenCard: (c: Card) => void; onAddSealed: () => void }) {
  const { items, settings } = store;
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('value');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [binder, setBinder] = useState<string>('all'); // 'all' | 'none' | binder id
  const current = store.binders.find(b => b.id === binder);
  const inBinder = (i: CollectionItem) => binder === 'all' || (binder === 'none' ? !i.binderId : i.binderId === binder);
  const binderValue = (id: string) => items.filter(i => i.binderId === id).reduce((s, i) => s + itemValue(i, settings), 0);
  const newBinder = () => { const n = prompt('Nombre de la carpeta'); if (n?.trim()) setBinder(store.addBinder(n).id); };

  const shown = useMemo(() => {
    const n = q.toLowerCase();
    const xs = items.filter(i => inBinder(i) && (filter === 'all' || i.kind === filter) &&
      (!n || (i.card?.name ?? i.sealedName ?? '').toLowerCase().includes(n) || (i.card?.set.name ?? '').toLowerCase().includes(n)));
    const name = (i: CollectionItem) => i.card?.name ?? i.sealedName ?? '';
    const cmp: Record<Sort, (a: CollectionItem, b: CollectionItem) => number> = {
      value: (a, b) => itemValue(b, settings) - itemValue(a, settings),
      name: (a, b) => name(a).localeCompare(name(b)),
      added: (a, b) => b.addedAt.localeCompare(a.addedAt),
      gain: (a, b) => (itemValue(b, settings) - itemCost(b)) - (itemValue(a, settings) - itemCost(a)),
      set: (a, b) => (b.card?.set.releaseDate ?? '').localeCompare(a.card?.set.releaseDate ?? '') || (parseInt(a.card?.number ?? '0') - parseInt(b.card?.number ?? '0')),
    };
    return xs.sort(cmp[sort]);
  }, [items, filter, sort, q, settings, binder]);

  const total = shown.reduce((s, i) => s + itemValue(i, settings), 0);

  const label = (i: CollectionItem) =>
    i.kind === 'graded' ? `${i.company} ${i.grade}` : i.kind === 'sealed' ? (i.sealedType ?? 'Sellado') : (i.condition ?? 'NM');

  return (
    <div>
      <div className="toolbar">
        <input className="search-input" placeholder="Filtrar colección…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={sort} onChange={e => setSort(e.target.value as Sort)}>
          <option value="value">Valor</option><option value="gain">Ganancia</option><option value="name">Nombre</option>
          <option value="set">Expansión</option><option value="added">Recientes</option>
        </select>
        <button className="btn ghost" onClick={() => setView(view === 'grid' ? 'list' : 'grid')}>{view === 'grid' ? '☰' : '▦'}</button>
      </div>
      <div className="binders" role="tablist" aria-label="Carpetas">
        <button role="tab" aria-selected={binder === 'all'} className={`binder ${binder === 'all' ? 'on' : ''}`} onClick={() => setBinder('all')}>
          <span className="binder-dot" />Todas<small>{items.length}</small>
        </button>
        {store.binders.map(b => (
          <button key={b.id} role="tab" aria-selected={binder === b.id} className={`binder ${binder === b.id ? 'on' : ''}`} onClick={() => setBinder(b.id)}>
            <span className="binder-dot" style={{ background: b.color }} />{b.name}<small>{fmt(binderValue(b.id), settings.currency)}</small>
          </button>
        ))}
        {store.binders.length > 0 && (
          <button role="tab" aria-selected={binder === 'none'} className={`binder ${binder === 'none' ? 'on' : ''}`} onClick={() => setBinder('none')}>
            <span className="binder-dot empty" />Sin carpeta
          </button>
        )}
        <button className="binder add" onClick={newBinder}>+ Carpeta</button>
      </div>
      {current && (
        <div className="binder-actions">
          <button className="link" onClick={() => { const n = prompt('Nuevo nombre', current.name); if (n?.trim()) store.renameBinder(current.id, n); }}>Renombrar</button>
          <button className="link danger-text" onClick={() => { if (confirm(`¿Borrar la carpeta "${current.name}"? Las cartas se quedan en tu colección.`)) { store.removeBinder(current.id); setBinder('all'); } }}>Borrar carpeta</button>
        </div>
      )}
      <div className="chips">
        {([['all', 'Todo'], ['card', 'Cartas'], ['graded', 'Gradeadas'], ['sealed', 'Sellado'], ['wish', `Deseos (${store.wishlist.length})`]] as const).map(([k, l]) =>
          <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
        <button className="chip add" onClick={onAddSealed}>+ Producto sellado</button>
      </div>
      {filter === 'wish' ? (
        <div className="grid">
          {!store.wishlist.length && <div className="muted">Marca cartas con ☆ para seguir su precio.</div>}
          {store.wishlist.map(c => <CardTile key={c.id} card={c} settings={settings} onClick={() => onOpenCard(c)} />)}
        </div>
      ) : <>
      <div className="muted small summary">{shown.reduce((s, i) => s + i.quantity, 0)} objetos · {fmt(total, settings.currency)}</div>

      {!shown.length && <div className="empty small-empty muted">{current ? 'Esta carpeta está vacía. Abre una carta y elige la carpeta al guardarla.' : 'No hay nada aquí todavía.'}</div>}

      {view === 'grid' ? (
        <div className="grid">
          {shown.map(i => (
            <button key={i.uid} className="tile" onClick={() => onOpen(i)}>
              <div className={`tile-img ${i.kind}`}>
                <img src={i.card?.images.small ?? i.sealedImage ?? './icon.svg'} alt="" loading="lazy" />
                <span className="tile-badge">{label(i)}</span>
                {i.quantity > 1 && <span className="tile-qty">×{i.quantity}</span>}
              </div>
              <div className="tile-name">{i.card?.name ?? i.sealedName}</div>
              <div className="tile-meta">{i.card ? `${i.card.set.name} · ${i.card.number}` : i.sealedType}</div>
              <div className="tile-price">{fmt(itemValue(i, settings), settings.currency)}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="list card-surface">
          {shown.map(i => {
            const d = itemValue(i, settings) - itemCost(i);
            return (
              <button key={i.uid} className="list-row" onClick={() => onOpen(i)}>
                <img src={i.card?.images.small ?? i.sealedImage ?? './icon.svg'} alt="" />
                <div className="grow">
                  <b>{i.card?.name ?? i.sealedName}</b>
                  <div className="muted small">{i.card ? `${i.card.set.name} · ${i.card.number}` : i.sealedType} · {label(i)} · ×{i.quantity}</div>
                </div>
                <div className="right">
                  <b>{fmt(itemValue(i, settings), settings.currency)}</b>
                  {i.purchasePrice != null && <div className={`small ${d >= 0 ? 'up' : 'down'}`}>{pct(itemCost(i) ? (d / itemCost(i)) * 100 : 0)}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
      </>}
    </div>
  );
}
