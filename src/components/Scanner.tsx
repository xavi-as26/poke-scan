import { useEffect, useRef, useState } from 'react';
import type { Card } from '../types';
import type { Store } from '../store';
import { searchCards } from '../api';
import { CardTile } from './CardTile';

type Worker = { recognize: (img: HTMLCanvasElement) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };
let workerP: Promise<Worker> | null = null;
const getWorker = () => (workerP ??= import('tesseract.js').then(t => t.createWorker('eng') as unknown as Promise<Worker>));

// Card aspect ratio 63×88mm
const RATIO = 63 / 88;
const NOISE = /^(basic|stage\s*\d?|pok[eé]mon|trainer|item|supporter|energy|evolves.*|hp.*|ex|v|vmax|vstar|gx)$/i;

function crop(src: HTMLCanvasElement, x: number, y: number, w: number, h: number, scale = 2) {
  const c = document.createElement('canvas');
  c.width = src.width * w * scale; c.height = src.height * h * scale;
  const ctx = c.getContext('2d')!;
  ctx.filter = 'grayscale(1) contrast(1.6)';
  ctx.drawImage(src, src.width * x, src.height * y, src.width * w, src.height * h, 0, 0, c.width, c.height);
  return c;
}

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
  if (m) return m[1].replace(/^0+(?=\d)/, '');
  const promo = text.match(/\b(SWSH|SVP?|SM|XY)\s?(\d{2,3})\b/i);
  return promo ? promo[1].toUpperCase() + promo[2] : '';
}

export function Scanner({ store, onOpen }: { store: Store; onOpen: (c: Card) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Card[]>([]);
  const [read, setRead] = useState<{ name: string; number: string } | null>(null);

  const start = async () => {
    setErr('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      setStream(s);
    } catch (e) { setErr('No se pudo acceder a la cámara. Puedes subir una foto en su lugar.'); }
  };
  useEffect(() => { if (video.current && stream) { video.current.srcObject = stream; video.current.play().catch(() => {}); } }, [stream]);
  useEffect(() => () => stream?.getTracks().forEach(t => t.stop()), [stream]);

  const analyse = async (canvas: HTMLCanvasElement) => {
    setBusy(true); setResults([]); setRead(null);
    try {
      setStatus('Cargando reconocimiento de texto…');
      const w = await getWorker();
      setStatus('Leyendo nombre…');
      const nameText = (await w.recognize(crop(canvas, 0.05, 0.02, 0.72, 0.09))).data.text;
      setStatus('Leyendo número…');
      const bottom = (await w.recognize(crop(canvas, 0, 0.88, 1, 0.12, 3))).data.text;
      const name = parseName(nameText), number = parseNumber(bottom);
      setRead({ name, number });
      setStatus('Buscando coincidencias…');
      let r = await searchCards({ name, number, pageSize: 12 });
      if (!r.cards.length && name) r = await searchCards({ name, pageSize: 12 });
      if (!r.cards.length && number) r = await searchCards({ number, pageSize: 12 });
      setResults(r.cards);
      setStatus(r.cards.length ? '' : 'No se encontraron coincidencias. Prueba con mejor luz o busca manualmente.');
      if (r.cards.length === 1) onOpen(r.cards[0]);
    } catch (e) {
      setStatus('Error al analizar la imagen.');
    } finally { setBusy(false); }
  };

  /** Grab the area inside the on-screen card guide. */
  const capture = () => {
    const v = video.current; if (!v || !v.videoWidth) return;
    const vw = v.videoWidth, vh = v.videoHeight;
    let h = vh * 0.86, w = h * RATIO;
    if (w > vw * 0.86) { w = vw * 0.86; h = w / RATIO; }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(v, (vw - w) / 2, (vh - h) / 2, w, h, 0, 0, w, h);
    analyse(c);
  };

  const onFile = (f?: File) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0); analyse(c);
    };
    img.src = URL.createObjectURL(f);
  };

  return (
    <div className="scanner">
      <div className="cam card-surface">
        {stream ? (
          <>
            <video ref={video} playsInline muted />
            <div className="guide"><span>Encuadra la carta</span></div>
          </>
        ) : (
          <div className="cam-off">
            <div className="empty-art">📷</div>
            <p className="muted">Apunta a una carta: leemos el nombre y el número para identificarla.</p>
            <button className="btn primary" onClick={start}>Activar cámara</button>
          </div>
        )}
      </div>
      <div className="scan-actions">
        {stream && <button className="btn primary shutter" onClick={capture} disabled={busy}>{busy ? '…' : 'Escanear'}</button>}
        <label className="btn ghost">Subir foto<input type="file" accept="image/*" capture="environment" hidden onChange={e => onFile(e.target.files?.[0])} /></label>
        {stream && <button className="btn ghost" onClick={() => { stream.getTracks().forEach(t => t.stop()); setStream(null); }}>Parar</button>}
      </div>
      {err && <div className="notice">{err}</div>}
      {status && <div className="muted center">{busy && <span className="spin" />} {status}</div>}
      {read && <div className="muted small center">Leído: <b>{read.name || '¿?'}</b> {read.number && <>· nº <b>{read.number}</b></>}</div>}
      {results.length > 0 && <div className="grid">{results.map(c => <CardTile key={c.id} card={c} settings={store.settings} onClick={() => onOpen(c)} />)}</div>}
    </div>
  );
}
