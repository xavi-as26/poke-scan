import { useEffect, useRef, useState } from 'react';
import type { Card, CatalogLang, Variant } from '../types';
import type { Store } from '../store';
import { getCard, searchCards } from '../api';
import { cardPrice, fmt, variantsOf } from '../prices';
import type { DetectedCard } from '../ai';
import { BinderSelect } from './BinderSelect';
import { Psa10Inline } from './Psa10';

type OcrWorker = { recognize: (img: HTMLCanvasElement) => Promise<{ data: { text: string } }> };
let workerP: Promise<OcrWorker> | null = null;
const getWorker = () => (workerP ??= import('tesseract.js').then(t => t.createWorker('eng') as unknown as Promise<OcrWorker>));

const CARD_RATIO = 63 / 88;
const PAGE_RATIO = 3 / 4;
const NOISE = /^(basic|stage\s*\d?|pok[eé]mon|trainer|item|supporter|energy|evolves.*|hp.*|ex|v|vmax|vstar|gx)$/i;

type Mode = 'single' | 'page';
type Grid = 4 | 9 | 12;
interface Box { x: number; y: number; w: number; h: number }
interface Found {
  key: string; box: Box; thumb: string;
  read: { name: string; number: string; lang: CatalogLang | 'other'; edition: DetectedCard['edition']; confidence?: string };
  candidates: Card[]; pick: number; selected: boolean;
}

function crop(src: HTMLCanvasElement, b: Box, scale = 1, filter = '') {
  const c = document.createElement('canvas');
  c.width = Math.max(1, src.width * b.w * scale); c.height = Math.max(1, src.height * b.h * scale);
  const ctx = c.getContext('2d')!;
  if (filter) ctx.filter = filter;
  ctx.drawImage(src, src.width * b.x, src.height * b.y, src.width * b.w, src.height * b.h, 0, 0, c.width, c.height);
  return c;
}
const sub = (o: Box, r: Box): Box => ({ x: o.x + r.x * o.w, y: o.y + r.y * o.h, w: r.w * o.w, h: r.h * o.h });

export function parseName(text: string) {
  const lines = text.split('\n').map(l => l.replace(/[^A-Za-zÀ-ÿ'’.\- ]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (const l of lines) {
    const words = l.split(' ').filter(w => w.length > 1 && !NOISE.test(w));
    if (words.length) return words.slice(0, 2).join(' ');
  }
  return '';
}
export function parseNumber(text: string) {
  const m = text.match(/(\d{1,3})\s*[/|l]\s*(\d{2,3})/);
  if (m) return { number: m[1].replace(/^0+(?=\d)/, ''), total: m[2] };
  const promo = text.match(/\b(SWSH|SVP?|SM|XY)\s?(\d{2,3})\b/i);
  return { number: promo ? promo[1].toUpperCase() + promo[2] : '', total: '' };
}

/** Find catalogue candidates for one read card, best first. */
async function match(d: { name: string; englishName?: string; number: string; total?: string; setName?: string; lang: string }): Promise<Card[]> {
  const lang: CatalogLang = d.lang === 'ja' ? 'ja' : 'en';
  const name = lang === 'ja' ? d.name : (d.englishName || d.name);
  const tries = [{ name, number: d.number }, { name }, { number: d.number }].filter(t => (t.name ?? '').trim() || (t.number ?? '').trim());
  let cards: Card[] = [];
  for (const t of tries) {
    cards = (await searchCards({ lang, ...t, pageSize: 24 })).cards;
    if (cards.length) break;
  }
  const num = d.number.replace(/^0+(?=\d)/, '');
  const score = (c: Card) =>
    (num && c.number.replace(/^0+(?=\d)/, '') === num ? 3 : 0) +
    (d.total && String(c.set.printedTotal) === d.total.replace(/^0+(?=\d)/, '') ? 3 : 0) +
    (d.setName && c.set.name.toLowerCase().includes(d.setName.toLowerCase()) ? 2 : 0) +
    (c.name.toLowerCase() === name.toLowerCase() ? 1 : 0);
  return cards.map(c => [c, score(c)] as const).sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 8);
}

function variantFor(card: Card, edition: DetectedCard['edition']): Variant {
  const vs = variantsOf(card);
  const want: Variant[] = edition === 'reverse_holo' ? ['reverseHolofoil'] : edition === 'first_edition' ? ['1stEditionHolofoil', '1stEditionNormal'] : edition === 'holo' ? ['holofoil'] : [];
  return want.find(v => vs.includes(v)) ?? vs[0];
}

export function Scanner({ store, onOpen, goSettings }: { store: Store; onOpen: (c: Card) => void; goSettings: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camErr, setCamErr] = useState('');
  const [mode, setMode] = useState<Mode>('single');
  const [grid, setGrid] = useState<Grid>(9);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<string>('');
  const [found, setFound] = useState<Found[]>([]);
  const [binderId, setBinderId] = useState<string>();
  const [added, setAdded] = useState(0);
  const ai = !!store.settings.anthropicKey;

  const start = async () => {
    setCamErr('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      setStream(s);
    } catch { setCamErr('No hay acceso a la cámara. Dale permiso en el navegador o sube una foto.'); }
  };
  useEffect(() => { if (video.current && stream) { video.current.srcObject = stream; video.current.play().catch(() => {}); } }, [stream]);
  useEffect(() => () => stream?.getTracks().forEach(t => t.stop()), [stream]);

  const analyse = async (canvas: HTMLCanvasElement) => {
    setBusy(true); setFound([]); setAdded(0);
    setShot(canvas.toDataURL('image/jpeg', 0.8));
    try {
      let reads: { box: Box; name: string; englishName?: string; number: string; total?: string; setName?: string; lang: CatalogLang | 'other'; edition: DetectedCard['edition']; confidence?: string }[] = [];
      if (ai) {
        setStatus(mode === 'page' ? 'La IA está buscando las cartas de la página…' : 'La IA está identificando la carta…');
        const { detectCards, canvasToJpeg } = await import('../ai');
        const det = await detectCards(store.settings.anthropicKey!, canvasToJpeg(canvas));
        reads = det.map(d => ({
          box: d.box, name: d.name, englishName: d.english_name, number: d.number, total: d.printed_total, setName: d.set_name,
          lang: (['en', 'ja', 'es', 'fr', 'de', 'it', 'pt'].includes(d.language) ? d.language : 'other') as CatalogLang | 'other',
          edition: d.edition, confidence: d.confidence,
        }));
      } else {
        setStatus('Cargando el lector de texto…');
        const w = await getWorker();
        const cols = grid === 4 ? 2 : 3, rows = mode === 'single' ? 1 : grid / cols;
        const cells: Box[] = mode === 'single' ? [{ x: 0, y: 0, w: 1, h: 1 }]
          : Array.from({ length: grid }, (_, i) => ({ x: (i % cols) / cols, y: Math.floor(i / cols) / rows, w: 1 / cols, h: 1 / rows }));
        for (const [i, cell] of cells.entries()) {
          setStatus(cells.length > 1 ? `Leyendo carta ${i + 1} de ${cells.length}…` : 'Leyendo nombre y número…');
          const nameText = (await w.recognize(crop(canvas, sub(cell, { x: 0.05, y: 0.02, w: 0.72, h: 0.09 }), 2, 'grayscale(1) contrast(1.6)'))).data.text;
          const bottom = (await w.recognize(crop(canvas, sub(cell, { x: 0, y: 0.88, w: 1, h: 0.12 }), 3, 'grayscale(1) contrast(1.6)'))).data.text;
          const name = parseName(nameText), n = parseNumber(bottom);
          if (name || n.number) reads.push({ box: cell, name, number: n.number, total: n.total, lang: 'en', edition: 'unknown' });
        }
      }
      if (!reads.length) { setStatus('No se ha encontrado ninguna carta. Prueba con más luz y la carta centrada.'); return; }
      setStatus(`Buscando ${reads.length === 1 ? 'la carta' : `${reads.length} cartas`} en el catálogo…`);
      const out: Found[] = [];
      for (const [i, r] of reads.entries()) {
        const candidates = await match(r).catch(() => []);
        out.push({
          key: `${Date.now()}-${i}`, box: r.box, thumb: crop(canvas, r.box, 0.5).toDataURL('image/jpeg', 0.7),
          read: { name: r.name, number: r.total ? `${r.number}/${r.total}` : r.number, lang: r.lang, edition: r.edition, confidence: r.confidence },
          candidates, pick: 0, selected: candidates.length > 0,
        });
        setFound([...out]);
      }
      setStatus('');
      if (mode === 'single' && out.length === 1 && out[0].candidates.length === 1) onOpen(out[0].candidates[0]);
    } catch (e) {
      setStatus(e instanceof Error && e.name === 'AiKeyError' ? `${e.message} Revísala en Ajustes.` : e instanceof Error ? e.message : 'No se pudo analizar la imagen.');
    } finally { setBusy(false); }
  };

  /** Grab what is inside the on-screen guide. */
  const capture = () => {
    const v = video.current; if (!v || !v.videoWidth) return;
    const vw = v.videoWidth, vh = v.videoHeight, ratio = mode === 'single' ? CARD_RATIO : PAGE_RATIO;
    let h = vh * 0.9, w = h * ratio;
    if (w > vw * 0.9) { w = vw * 0.9; h = w / ratio; }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(v, (vw - w) / 2, (vh - h) / 2, w, h, 0, 0, w, h);
    analyse(c);
  };
  const onFile = (f?: File) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0); URL.revokeObjectURL(img.src); analyse(c);
    };
    img.src = URL.createObjectURL(f);
  };

  const update = (key: string, patch: Partial<Found>) => setFound(fs => fs.map(f => f.key === key ? { ...f, ...patch } : f));
  const chosen = found.filter(f => f.selected && f.candidates[f.pick]);
  const total = chosen.reduce((s, f) => s + (cardPrice(f.candidates[f.pick], store.settings) ?? 0), 0);
  const addAll = async () => {
    setBusy(true); setStatus('Guardando…');
    // Summaries from TCGdex have no prices yet: load the full card before saving
    const cards = await Promise.all(chosen.map(f => { const c = f.candidates[f.pick]; return c.partial ? getCard(c.id).then(full => full ?? c) : c; }));
    setBusy(false); setStatus('');
    chosen.forEach((f, i) => {
      const card = cards[i];
      store.add({ kind: 'card', card, quantity: 1, condition: 'NM', variant: variantFor(card, f.read.edition), binderId,
        language: (f.read.lang === 'other' ? (card.lang ?? 'en') : f.read.lang).toUpperCase() });
    });
    setAdded(chosen.length); setFound([]); setShot('');
  };

  return (
    <div className="scanner">
      <div className="scan-head">
        <div className="seg" role="tablist" aria-label="Modo de escaneo">
          <button role="tab" aria-selected={mode === 'single'} className={mode === 'single' ? 'on' : ''} onClick={() => setMode('single')}>Una carta</button>
          <button role="tab" aria-selected={mode === 'page'} className={mode === 'page' ? 'on' : ''} onClick={() => setMode('page')}>Página completa</button>
        </div>
        {mode === 'page' && !ai && (
          <label className="grid-pick">Cuadrícula
            <select value={grid} onChange={e => setGrid(+e.target.value as Grid)}>
              <option value={4}>2 × 2</option><option value={9}>3 × 3</option><option value={12}>3 × 4</option>
            </select>
          </label>
        )}
      </div>
      <div className={`engine ${ai ? 'on' : ''}`}>
        {ai ? <>✦ Reconocimiento con IA activado: identifica la imagen completa, cartas japonesas incluidas.</>
          : <>Modo básico: lee el nombre y el número con OCR. {mode === 'page' && 'Coloca las cartas alineadas con la cuadrícula. '}
            <button className="link" onClick={goSettings}>Activar IA en Ajustes</button></>}
      </div>

      <div className={`cam card-surface ${mode}`}>
        {stream ? (
          <>
            <video ref={video} playsInline muted aria-label="Vista de la cámara" />
            <div className={`guide ${mode}`}>
              {mode === 'page' && !ai && <div className="guide-grid" style={{ gridTemplateColumns: `repeat(${grid === 4 ? 2 : 3}, 1fr)` }}>{Array.from({ length: grid }, (_, i) => <span key={i} />)}</div>}
              <em>{mode === 'single' ? 'Encuadra la carta' : 'Encuadra la página de la carpeta'}</em>
            </div>
          </>
        ) : shot ? (
          <div className="shot">
            <img src={shot} alt="Foto analizada" />
            {found.map((f, i) => (
              <span key={f.key} className={`box ${f.candidates.length ? '' : 'miss'}`} style={{ left: `${f.box.x * 100}%`, top: `${f.box.y * 100}%`, width: `${f.box.w * 100}%`, height: `${f.box.h * 100}%` }}>{i + 1}</span>
            ))}
          </div>
        ) : (
          <div className="cam-off">
            <div className="empty-art" aria-hidden>📷</div>
            <p className="muted">{mode === 'single' ? 'Apunta a una carta para identificarla y ver su precio.' : 'Haz una foto a una página de tu carpeta y añade todas las cartas de una vez.'}</p>
            <button className="btn primary" onClick={start}>Activar cámara</button>
          </div>
        )}
      </div>
      <div className="scan-actions">
        {stream && <button className="btn primary shutter" onClick={capture} disabled={busy}>{busy ? 'Analizando…' : mode === 'single' ? 'Escanear' : 'Escanear página'}</button>}
        <label className="btn ghost" tabIndex={0} onKeyDown={e => e.key === 'Enter' && (e.currentTarget.querySelector('input') as HTMLInputElement)?.click()}>
          Subir foto<input type="file" accept="image/*" hidden onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {stream && <button className="btn ghost" onClick={() => { stream.getTracks().forEach(t => t.stop()); setStream(null); }}>Apagar cámara</button>}
      </div>
      {camErr && <div className="notice">{camErr}</div>}
      {status && <div className="muted center" role="status">{busy && <span className="spin" />} {status}</div>}
      {added > 0 && <div className="notice ok" role="status">✓ {added === 1 ? 'Carta añadida' : `${added} cartas añadidas`} a tu colección.</div>}

      {found.length > 0 && (
        <section className="found">
          <div className="found-head">
            <h3>{found.length === 1 ? 'Carta encontrada' : `${found.length} cartas encontradas`}</h3>
            <span className="muted small">{chosen.length} seleccionadas · {fmt(total, store.settings.currency)}</span>
          </div>
          <div className="list card-surface">
            {found.map((f, i) => {
              const c = f.candidates[f.pick];
              return (
                <div key={f.key} className="found-row">
                  <input type="checkbox" aria-label={`Añadir carta ${i + 1}`} checked={f.selected} disabled={!c} onChange={e => update(f.key, { selected: e.target.checked })} />
                  <span className="found-n">{i + 1}</span>
                  <img src={f.thumb} alt={`Recorte ${i + 1}`} className="found-thumb" />
                  {c ? <button className="found-match" onClick={() => onOpen(c)}><img src={c.images.small} alt={c.name} /></button> : <div className="found-match empty" />}
                  <div className="grow">
                    {c ? <>
                      <b>{c.name}</b>
                      <div className="muted small">{c.set.name} · {c.number}{c.set.printedTotal ? `/${c.set.printedTotal}` : ''}</div>
                      {f.candidates.length > 1 && (
                        <select aria-label="Otras coincidencias" value={f.pick} onChange={e => update(f.key, { pick: +e.target.value })}>
                          {f.candidates.map((o, k) => <option key={o.id} value={k}>{o.name} — {o.set.name} {o.number}</option>)}
                        </select>
                      )}
                    </> : <><b>Sin coincidencias</b><div className="muted small">Leído: {f.read.name || '¿?'} {f.read.number}</div></>}
                  </div>
                  <div className="right">
                    {c && !c.partial && <b>{fmt(cardPrice(c, store.settings, variantFor(c, f.read.edition)), store.settings.currency)}</b>}
                    {c && <Psa10Inline card={c} settings={store.settings} variant={variantFor(c, f.read.edition)} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="found-foot">
            <BinderSelect store={store} value={binderId} onChange={setBinderId} />
            <button className="btn primary" onClick={addAll} disabled={!chosen.length || busy}>Añadir {chosen.length} a la colección</button>
          </div>
        </section>
      )}
    </div>
  );
}
