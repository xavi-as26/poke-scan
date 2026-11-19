import type { CatalogLang } from '../types';

export const CATALOG_LANGS: { id: CatalogLang; label: string }[] = [
  { id: 'en', label: 'Inglés' }, { id: 'ja', label: 'Japonés' }, { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Francés' }, { id: 'de', label: 'Alemán' }, { id: 'it', label: 'Italiano' }, { id: 'pt', label: 'Portugués' },
];

export function LangPicker({ value, onChange }: { value: CatalogLang; onChange: (l: CatalogLang) => void }) {
  return (
    <select className="lang-picker" aria-label="Idioma del catálogo" value={value} onChange={e => onChange(e.target.value as CatalogLang)}>
      {CATALOG_LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
    </select>
  );
}
