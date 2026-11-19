import type { Store } from '../store';

const NEW = '__new__';

/** Binder picker for forms; the last option creates a binder inline. */
export function BinderSelect({ store, value, onChange }: { store: Store; value?: string; onChange: (id?: string) => void }) {
  return (
    <label>Carpeta
      <select value={value ?? ''} onChange={e => {
        const v = e.target.value;
        if (v === NEW) {
          const name = prompt('Nombre de la carpeta nueva');
          if (name?.trim()) onChange(store.addBinder(name).id);
          return;
        }
        onChange(v || undefined);
      }}>
        <option value="">Sin carpeta</option>
        {store.binders.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        <option value={NEW}>+ Nueva carpeta…</option>
      </select>
    </label>
  );
}
