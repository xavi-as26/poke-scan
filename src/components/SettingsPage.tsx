import { useRef, useState } from 'react';
import type { Store } from '../store';
import { DEMO_CARDS } from '../demo';
import type { CollectionItem } from '../types';
import { itemCost, itemValue } from '../prices';

export function SettingsPage({ store }: { store: Store }) {
  const { settings, setSettings } = store;
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, items: store.items, history: store.history, wishlist: store.wishlist, settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `pokescan-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  const exportCsv = () => {
    const rows = [['tipo', 'nombre', 'expansion', 'numero', 'variante', 'estado', 'idioma', 'empresa', 'nota', 'cantidad', 'precio_compra', 'valor_manual']];
    store.items.forEach(i => rows.push([i.kind, i.card?.name ?? i.sealedName ?? '', i.card?.set.name ?? '', i.card?.number ?? '', i.variant ?? '', i.condition ?? '',
      i.language ?? '', i.company ?? '', i.grade ?? '', String(i.quantity), i.purchasePrice?.toString() ?? '', i.manualValue?.toString() ?? '']));
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'pokescan.csv'; a.click();
  };
  const importJson = async (f?: File) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.items)) throw new Error();
      store.setItems(d.items); if (Array.isArray(d.history)) store.setHistory(d.history);
      setMsg(`Importados ${d.items.length} objetos.`);
    } catch { setMsg('Archivo no válido.'); }
  };
  const loadDemo = () => {
    const demo: Omit<CollectionItem, 'uid' | 'addedAt'>[] = DEMO_CARDS.slice(0, 7).map((card, i) => ({
      kind: i === 4 ? 'graded' : 'card', card, quantity: 1, condition: 'NM', language: 'EN', variant: 'holofoil',
      purchasePrice: Math.round((card.cardmarket?.prices?.avg30 ?? 1) * 0.85), ...(i === 4 ? { company: 'PSA', grade: '10' } : {}),
    }));
    demo.push({ kind: 'sealed', sealedName: 'Scarlet & Violet 151 Booster Bundle', sealedType: 'Booster Bundle', quantity: 2, purchasePrice: 35, manualValue: 48, language: 'EN' });
    demo.forEach(d => store.add(d));
    // Illustrative value history ending at the sample collection's current value
    const all = [...store.items, ...demo.map(d => ({ ...d, uid: '', addedAt: '' }))];
    const value = all.reduce((s, i) => s + itemValue(i, settings), 0);
    const cost = all.reduce((s, i) => s + itemCost(i), 0);
    const today = Date.now();
    store.setHistory(Array.from({ length: 60 }, (_, k) => ({
      date: new Date(today - (59 - k) * 864e5).toISOString().slice(0, 10),
      value: Math.round(value * (0.82 + 0.18 * (k / 59)) * (1 + Math.sin(k / 4) * 0.02)),
      cost: Math.round(cost),
    })));
    setMsg('Colección de ejemplo añadida.');
  };

  return (
    <div className="settings">
      <section className="card-surface pad">
        <h3>Precios</h3>
        <div className="fields">
          <label>Moneda<select value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value as 'EUR' | 'USD' })}>
            <option value="EUR">Euro (€)</option><option value="USD">Dólar ($)</option></select></label>
          <label>Fuente preferida<select value={settings.source} onChange={e => setSettings({ ...settings, source: e.target.value as 'cardmarket' | 'tcgplayer' })}>
            <option value="cardmarket">Cardmarket</option><option value="tcgplayer">TCGplayer</option></select></label>
        </div>
        <label className="full">API key de pokemontcg.io (opcional, sube el límite de peticiones)
          <input value={settings.apiKey ?? ''} onChange={e => setSettings({ ...settings, apiKey: e.target.value.trim() || undefined })} placeholder="xxxxxxxx-xxxx-…" /></label>
        <p className="hint">Si la fuente elegida no tiene precio para una carta se usa la otra, convirtiendo la moneda con un tipo fijo aproximado.</p>
      </section>
      <section className="card-surface pad">
        <h3>Datos</h3>
        <p className="muted small">Tu colección se guarda solo en este navegador. Exporta una copia para no perderla.</p>
        <div className="btn-row">
          <button className="btn ghost" onClick={exportJson}>Exportar JSON</button>
          <button className="btn ghost" onClick={exportCsv}>Exportar CSV</button>
          <button className="btn ghost" onClick={() => file.current?.click()}>Importar JSON</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={e => importJson(e.target.files?.[0])} />
          <button className="btn ghost" onClick={loadDemo}>Cargar ejemplo</button>
          <button className="btn danger" onClick={() => { if (confirm('¿Borrar toda la colección?')) { store.setItems([]); store.setHistory([]); store.setWishlist([]); } }}>Borrar todo</button>
        </div>
        {msg && <p className="hint">{msg}</p>}
      </section>
      <p className="muted small center">PokeScan es una app no oficial, sin relación con Nintendo, Creatures, GAME FREAK ni The Pokémon Company. Datos de cartas: pokemontcg.io.</p>
    </div>
  );
}
