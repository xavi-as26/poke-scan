import { useEffect, useState } from 'react';
import type { Card, CollectionItem, Condition, GradingCompany, Variant } from '../types';
import type { Store } from '../store';
import { cardPrice, fmt, priceTrend, variantsOf } from '../prices';
import { getCard } from '../api';
import { BinderSelect } from './BinderSelect';
import { Psa10Box } from './Psa10';
import { LineChart } from './Chart';

const CONDITIONS: Condition[] = ['M', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'];
const COMPANIES: GradingCompany[] = ['PSA', 'BGS', 'CGC', 'SGC', 'TAG', 'ACE'];
const LANGS = ['EN', 'ES', 'DE', 'FR', 'IT', 'PT', 'JA', 'KO', 'ZH'];
const VARIANT_LABEL: Record<string, string> = {
  normal: 'Normal', holofoil: 'Holo', reverseHolofoil: 'Reverse Holo',
  '1stEditionHolofoil': '1ª Ed. Holo', '1stEditionNormal': '1ª Ed.', unlimitedHolofoil: 'Unlimited Holo',
};

export function CardModal({ card: initialCard, store, onClose, editing }: { card: Card; store: Store; onClose: () => void; editing?: CollectionItem }) {
  const { settings } = store;
  const [card, setCard] = useState<Card>(initialCard);
  const [loadErr, setLoadErr] = useState(false);
  // Search results from TCGdex carry no prices or rarity: load the full card
  useEffect(() => {
    if (!initialCard.partial) return;
    let live = true;
    getCard(initialCard.id).then(c => { if (!live) return; if (c) setCard(c); else setLoadErr(true); });
    return () => { live = false; };
  }, [initialCard]);
  useEffect(() => { if (!initialCard.partial) return; setVariant(v => variantsOf(card).includes(v) ? v : variantsOf(card)[0]); }, [card]);
  const [kind, setKind] = useState<'card' | 'graded'>(editing?.kind === 'graded' ? 'graded' : 'card');
  const [qty, setQty] = useState(editing?.quantity ?? 1);
  const [variant, setVariant] = useState<Variant>(editing?.variant ?? variantsOf(initialCard)[0]);
  const [condition, setCondition] = useState<Condition>(editing?.condition ?? 'NM');
  const [language, setLanguage] = useState(editing?.language ?? (initialCard.lang ?? 'en').toUpperCase());
  const [binderId, setBinderId] = useState(editing?.binderId);
  const [company, setCompany] = useState<GradingCompany>(editing?.company ?? 'PSA');
  const [grade, setGrade] = useState(editing?.grade ?? '10');
  const [cert, setCert] = useState(editing?.cert ?? '');
  const [purchase, setPurchase] = useState(editing?.purchasePrice?.toString() ?? '');
  const [manual, setManual] = useState(editing?.manualValue?.toString() ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const owned = store.items.filter(i => i.card?.id === card.id).reduce((s, i) => s + i.quantity, 0);
  const wished = store.wishlist.some(w => w.id === card.id);
  const trend = priceTrend(card, settings);
  const tp = card.tcgplayer?.prices ?? {};
  const cm = card.cardmarket?.prices ?? {};
  const num = (s: string) => (s.trim() === '' ? undefined : parseFloat(s.replace(',', '.')));

  const submit = () => {
    const data: Omit<CollectionItem, 'uid' | 'addedAt'> = {
      kind, card, quantity: Math.max(1, qty), variant, condition, language,
      purchasePrice: num(purchase), manualValue: num(manual), notes: notes || undefined, binderId,
      ...(kind === 'graded' ? { company, grade, cert: cert || undefined } : {}),
    };
    if (editing) store.update(editing.uid, data); else store.add(data);
    setDone(true);
    setTimeout(onClose, 600);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-label={card.name}>
        <button className="modal-x" onClick={onClose} aria-label="Cerrar">×</button>
        <div className="detail">
          <div className="detail-img"><img src={card.images.large} alt={card.name} /></div>
          <div className="detail-body">
            <div className="detail-head">
              <div>
                <h2>{card.name}</h2>
                <div className="muted">{[card.set.name, `#${card.number}${card.set.printedTotal ? `/${card.set.printedTotal}` : ''}`, card.rarity].filter(Boolean).join(' · ')}</div>
                {card.artist && <div className="muted small">Ilustración: {card.artist}</div>}
              </div>
              <button className={`chip ${wished ? 'on' : ''}`} onClick={() => store.toggleWish(card)}>{wished ? '★ En deseos' : '☆ Deseos'}</button>
            </div>
            <div className="big-price">{fmt(cardPrice(card, settings, variant), settings.currency)}
              {owned > 0 && <span className="owned">Tienes {owned}</span>}
            </div>
            {trend.length > 1 && <LineChart data={trend} height={110} format={v => fmt(v, settings.currency)} />}

            <div className="price-grid">
              {Object.keys(cm).length > 0 && (
                <div className="price-box">
                  <h4>Cardmarket <small>EUR</small></h4>
                  {([['Tendencia', cm.trendPrice], ['Media venta', cm.averageSellPrice], ['Desde', cm.lowPrice], ['Media 30d', cm.avg30]] as const)
                    .map(([l, v]) => <div key={l} className="row"><span>{l}</span><b>{fmt(v, 'EUR')}</b></div>)}
                  {card.cardmarket?.url && <a href={card.cardmarket.url} target="_blank" rel="noreferrer">Ver en Cardmarket ↗</a>}
                </div>
              )}
              {Object.keys(tp).length > 0 && (
                <div className="price-box">
                  <h4>TCGplayer <small>USD</small></h4>
                  {Object.entries(tp).map(([v, p]) => <div key={v} className="row"><span>{VARIANT_LABEL[v] ?? v}</span><b>{fmt(p.market ?? p.mid, 'USD')}</b></div>)}
                  {card.tcgplayer?.url && <a href={card.tcgplayer.url} target="_blank" rel="noreferrer">Ver en TCGplayer ↗</a>}
                </div>
              )}
              <Psa10Box card={card} settings={settings} variant={variant} />
              {card.partial && !loadErr && <div className="muted"><span className="spin" /> Cargando precios…</div>}
              {loadErr && <div className="muted">No se pudieron cargar los detalles de esta carta.</div>}
              {!card.partial && !Object.keys(cm).length && !Object.keys(tp).length && <div className="muted">Sin precio de mercado para esta carta. Puedes poner un valor manual.</div>}
            </div>

            <div className="form">
              <div className="seg">
                <button className={kind === 'card' ? 'on' : ''} onClick={() => setKind('card')}>Carta</button>
                <button className={kind === 'graded' ? 'on' : ''} onClick={() => setKind('graded')}>Gradeada</button>
              </div>
              <div className="fields">
                <label>Cantidad<input type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)} /></label>
                <label>Variante<select value={variant} onChange={e => setVariant(e.target.value as Variant)}>
                  {variantsOf(card).map(v => <option key={v} value={v}>{VARIANT_LABEL[v] ?? v}</option>)}</select></label>
                <label>Idioma<select value={language} onChange={e => setLanguage(e.target.value)}>
                  {LANGS.map(l => <option key={l}>{l}</option>)}</select></label>
                {kind === 'card' ? (
                  <label>Estado<select value={condition} onChange={e => setCondition(e.target.value as Condition)}>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}</select></label>
                ) : (<>
                  <label>Empresa<select value={company} onChange={e => setCompany(e.target.value as GradingCompany)}>
                    {COMPANIES.map(c => <option key={c}>{c}</option>)}</select></label>
                  <label>Nota<select value={grade} onChange={e => setGrade(e.target.value)}>
                    {['10', '9.5', '9', '8.5', '8', '7', '6', '5', '4', '3', '2', '1'].map(g => <option key={g}>{g}</option>)}</select></label>
                  <label>Nº certificado<input value={cert} onChange={e => setCert(e.target.value)} placeholder="opcional" /></label>
                </>)}
                <BinderSelect store={store} value={binderId} onChange={setBinderId} />
                <label>Precio compra ({settings.currency})<input inputMode="decimal" value={purchase} onChange={e => setPurchase(e.target.value)} placeholder="por unidad" /></label>
                <label>Valor manual ({settings.currency})<input inputMode="decimal" value={manual} onChange={e => setManual(e.target.value)} placeholder={kind === 'graded' ? 'recomendado' : 'opcional'} /></label>
              </div>
              <label className="full">Notas<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="opcional" /></label>
              {kind === 'graded' && !manual && (
                <p className="hint">Sin valor manual se usa el precio real de PSA (PSA 10 y 9, si hay token de PriceCharting) o, si no, una estimación a partir del precio sin gradear ({fmt(cardPrice(card, settings, variant), settings.currency)}).</p>
              )}
              <button className="btn primary" onClick={submit} disabled={done}>{done ? '✓ Guardado' : editing ? 'Guardar cambios' : 'Añadir a la colección'}</button>
              {editing && <button className="btn danger" onClick={() => { store.remove(editing.uid); onClose(); }}>Eliminar</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
