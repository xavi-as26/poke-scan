import { useMemo, useState } from 'react';
import type { Store } from '../store';
import type { CollectionItem } from '../types';
import { fmt, itemCost, itemValue, pct } from '../prices';
import { LineChart } from './Chart';

const RANGES = [['7D', 7], ['1M', 30], ['3M', 90], ['1A', 365], ['Todo', 99999]] as const;

export function Dashboard({ store, onOpen, refreshing, onRefresh, goSearch }: {
  store: Store; onOpen: (i: CollectionItem) => void; refreshing: boolean; onRefresh: () => void; goSearch: () => void;
}) {
  const { items, settings, history } = store;
  const [range, setRange] = useState<number>(30);
  const c = settings.currency;

  const totals = useMemo(() => {
    const value = items.reduce((s, i) => s + itemValue(i, settings), 0);
    const cost = items.reduce((s, i) => s + itemCost(i), 0);
    const by = (k: CollectionItem['kind']) => items.filter(i => i.kind === k);
    const count = (xs: CollectionItem[]) => xs.reduce((s, i) => s + i.quantity, 0);
    const val = (xs: CollectionItem[]) => xs.reduce((s, i) => s + itemValue(i, settings), 0);
    return {
      value, cost, pl: value - cost,
      cards: count(by('card')), graded: count(by('graded')), sealed: count(by('sealed')),
      vCards: val(by('card')), vGraded: val(by('graded')), vSealed: val(by('sealed')),
    };
  }, [items, settings]);

  const series = useMemo(() => {
    const cutoff = new Date(Date.now() - range * 864e5).toISOString().slice(0, 10);
    return history.filter(h => h.date >= cutoff).map(h => ({
      label: new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), value: h.value, value2: h.cost,
    }));
  }, [history, range]);
  const change = series.length > 1 ? series[series.length - 1].value - series[0].value : 0;
  const changePct = series.length > 1 && series[0].value ? (change / series[0].value) * 100 : 0;

  const top = useMemo(() => [...items].sort((a, b) => itemValue(b, settings) - itemValue(a, settings)).slice(0, 8), [items, settings]);
  const movers = useMemo(() => items
    .filter(i => i.purchasePrice && i.kind !== 'sealed')
    .map(i => ({ i, d: itemValue(i, settings) - itemCost(i) }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5), [items, settings]);

  if (!items.length) return (
    <div className="empty">
      <div className="empty-art">🃏</div>
      <h2>Empieza tu colección</h2>
      <p className="muted">Escanea o busca tus cartas para ver el valor de tu portfolio con precios de Cardmarket y TCGplayer.</p>
      <button className="btn primary" onClick={goSearch}>Añadir cartas</button>
    </div>
  );

  return (
    <div className="dash">
      <section className="hero card-surface">
        <div className="hero-top">
          <div>
            <div className="muted small">Valor del portfolio</div>
            <div className="hero-value">{fmt(totals.value, c)}</div>
            <div className={`delta ${totals.pl >= 0 ? 'up' : 'down'}`}>
              {fmt(totals.pl, c)} {totals.cost > 0 && `(${pct((totals.pl / totals.cost) * 100)})`} <span className="muted">vs. coste</span>
            </div>
            {series.length > 1 && <div className={`delta small ${change >= 0 ? 'up' : 'down'}`}>{fmt(change, c)} ({pct(changePct)}) en el periodo</div>}
          </div>
          <button className="btn ghost" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'Actualizando…' : '↻ Precios'}</button>
        </div>
        <LineChart data={series} format={v => fmt(v, c)} />
        <div className="ranges">
          {RANGES.map(([l, d]) => <button key={l} className={range === d ? 'on' : ''} onClick={() => setRange(d)}>{l}</button>)}
        </div>
        <p className="muted small">Se guarda un punto por día cada vez que abres la app o actualizas precios. La línea discontinua es tu coste.</p>
      </section>

      <section className="stats">
        <div className="stat card-surface"><span>Cartas</span><b>{totals.cards}</b><small>{fmt(totals.vCards, c)}</small></div>
        <div className="stat card-surface"><span>Gradeadas</span><b>{totals.graded}</b><small>{fmt(totals.vGraded, c)}</small></div>
        <div className="stat card-surface"><span>Sellado</span><b>{totals.sealed}</b><small>{fmt(totals.vSealed, c)}</small></div>
        <div className="stat card-surface"><span>Invertido</span><b>{fmt(totals.cost, c)}</b><small>coste total</small></div>
      </section>

      <section>
        <h3>Más valiosas</h3>
        <div className="strip">
          {top.map(i => (
            <button key={i.uid} className="mini" onClick={() => onOpen(i)}>
              <img src={i.card?.images.small ?? i.sealedImage ?? './icon.svg'} alt="" loading="lazy" />
              <div className="mini-name">{i.card?.name ?? i.sealedName}</div>
              <div className="mini-price">{fmt(itemValue(i, settings), c)}</div>
            </button>
          ))}
        </div>
      </section>

      {movers.length > 0 && (
        <section>
          <h3>Mayor ganancia / pérdida</h3>
          <div className="list card-surface">
            {movers.map(({ i, d }) => (
              <button key={i.uid} className="list-row" onClick={() => onOpen(i)}>
                <img src={i.card?.images.small} alt="" />
                <div className="grow"><b>{i.card?.name}</b><div className="muted small">{i.card?.set.name}</div></div>
                <div className={d >= 0 ? 'up' : 'down'}>{fmt(d, c)}<div className="small">{pct((d / itemCost(i)) * 100)}</div></div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
