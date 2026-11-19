import { useState } from 'react';
import type { Store } from '../store';
import type { CollectionItem } from '../types';
import { BinderSelect } from './BinderSelect';

const TYPES = ['Booster Box', 'Elite Trainer Box', 'Booster', 'Booster Bundle', 'Collection Box', 'Tin', 'Blister', 'Display', 'Otro'];

export function SealedModal({ store, onClose, editing }: { store: Store; onClose: () => void; editing?: CollectionItem }) {
  const [name, setName] = useState(editing?.sealedName ?? '');
  const [type, setType] = useState(editing?.sealedType ?? TYPES[0]);
  const [qty, setQty] = useState(editing?.quantity ?? 1);
  const [purchase, setPurchase] = useState(editing?.purchasePrice?.toString() ?? '');
  const [value, setValue] = useState(editing?.manualValue?.toString() ?? '');
  const [image, setImage] = useState(editing?.sealedImage ?? '');
  const [language, setLanguage] = useState(editing?.language ?? 'EN');
  const [binderId, setBinderId] = useState(editing?.binderId);
  const num = (s: string) => (s.trim() === '' ? undefined : parseFloat(s.replace(',', '.')));
  const c = store.settings.currency;

  const save = () => {
    if (!name.trim()) return;
    const data = { kind: 'sealed' as const, sealedName: name.trim(), sealedType: type, quantity: Math.max(1, qty), language, binderId,
      purchasePrice: num(purchase), manualValue: num(value), sealedImage: image || undefined };
    if (editing) store.update(editing.uid, data); else store.add(data);
    onClose();
  };
  const onFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      // downscale to keep localStorage small
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 320 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = img.width * s; cv.height = img.height * s;
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
        setImage(cv.toDataURL('image/jpeg', 0.8));
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(f);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal narrow" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>×</button>
        <h2>{editing ? 'Editar producto sellado' : 'Añadir producto sellado'}</h2>
        <div className="form">
          <label className="full">Nombre<input value={name} onChange={e => setName(e.target.value)} placeholder="p. ej. Scarlet & Violet 151 ETB" autoFocus /></label>
          <div className="fields">
            <label>Tipo<select value={type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
            <label>Idioma<select value={language} onChange={e => setLanguage(e.target.value)}>{['EN', 'ES', 'DE', 'FR', 'IT', 'JP', 'KR', 'ZH'].map(l => <option key={l}>{l}</option>)}</select></label>
            <label>Cantidad<input type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)} /></label>
            <label>Precio compra ({c})<input inputMode="decimal" value={purchase} onChange={e => setPurchase(e.target.value)} /></label>
            <label>Valor actual ({c})<input inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="= compra si vacío" /></label>
            <BinderSelect store={store} value={binderId} onChange={setBinderId} />
            <label>Foto<input type="file" accept="image/*" onChange={e => onFile(e.target.files?.[0])} /></label>
          </div>
          {image && <img src={image} alt="" className="sealed-preview" />}
          <button className="btn primary" onClick={save} disabled={!name.trim()}>Guardar</button>
          {editing && <button className="btn danger" onClick={() => { store.remove(editing.uid); onClose(); }}>Eliminar</button>}
        </div>
      </div>
    </div>
  );
}
