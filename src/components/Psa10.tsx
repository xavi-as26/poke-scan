import { useEffect, useState } from 'react';
import type { Card, Settings, Variant } from '../types';
import { fetchGraded, type GradedPrices } from '../graded';
import { convert, fmt, psa10Estimate } from '../prices';

type State = { status: 'idle' | 'loading' | 'done' | 'error'; data?: GradedPrices | null; error?: string };

export function useGraded(card: Card | undefined, settings: Settings): State {
  const [st, setSt] = useState<State>({ status: 'idle' });
  const token = settings.pricechartingToken;
  useEffect(() => {
    if (!card || card.partial || !token) { setSt({ status: 'idle' }); return; }
    let live = true;
    setSt({ status: 'loading' });
    fetchGraded(card, token)
      .then(d => live && setSt({ status: 'done', data: d }))
      .catch(e => live && setSt({ status: 'error', error: e?.name === 'GradedTokenError' ? e.message : 'No se pudo consultar PriceCharting.' }));
    return () => { live = false; };
  }, [card?.id, card?.partial, token]);
  return st;
}

/** One-line PSA 10 value for lists (scanner results). */
export function Psa10Inline({ card, settings, variant }: { card: Card; settings: Settings; variant?: Variant }) {
  const g = useGraded(card, settings);
  const c = settings.currency;
  if (card.partial) return null;
  if (g.status === 'loading') return <span className="psa-inline muted">PSA 10 …</span>;
  if (g.data?.psa10 != null) return <span className="psa-inline">PSA 10 <b>{fmt(convert(g.data.psa10, 'USD', c), c)}</b></span>;
  const est = psa10Estimate(card, settings, variant);
  return est != null ? <span className="psa-inline" title="Estimación: precio sin gradear × 4">PSA 10 <b>≈ {fmt(est, c)}</b> <em>est.</em></span> : null;
}

/** Price box for the card detail modal. */
export function Psa10Box({ card, settings, variant }: { card: Card; settings: Settings; variant?: Variant }) {
  const g = useGraded(card, settings);
  const c = settings.currency;
  if (card.partial) return null;
  const real = g.data;
  const est = psa10Estimate(card, settings, variant);
  return (
    <div className="price-box psa-box">
      <h4>Gradeada PSA <small>{real ? 'PriceCharting · USD' : 'estimación'}</small></h4>
      {g.status === 'loading' && <div className="muted"><span className="spin" /> Consultando…</div>}
      {real && <>
        <div className="row"><span>PSA 10</span><b>{fmt(real.psa10 != null ? convert(real.psa10, 'USD', c) : undefined, c)}</b></div>
        <div className="row"><span>PSA 9</span><b>{fmt(real.psa9 != null ? convert(real.psa9, 'USD', c) : undefined, c)}</b></div>
        {real.product && <div className="muted small">Coincidencia: {real.product}</div>}
        {real.url && <a href={real.url} target="_blank" rel="noreferrer">Ver en PriceCharting ↗</a>}
      </>}
      {!real && g.status !== 'loading' && <>
        <div className="row"><span>PSA 10</span><b>{est != null ? `≈ ${fmt(est, c)}` : '—'}</b></div>
        <p className="hint">
          {g.status === 'error' ? g.error + ' ' : g.status === 'done' ? 'PriceCharting no tiene esta carta. ' : ''}
          Estimación aproximada (precio sin gradear × 4); el precio real de una PSA 10 puede ser muy distinto.
          {!settings.pricechartingToken && ' Añade un token de PriceCharting en Ajustes para ver ventas reales.'}
        </p>
      </>}
    </div>
  );
}
