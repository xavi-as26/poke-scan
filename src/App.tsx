import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import type { Card, CardSet, CatalogLang, CollectionItem } from './types';
import { refreshCards, setApiKey } from './api';
import { itemCost, itemValue } from './prices';
import { Dashboard } from './components/Dashboard';
import { Collection } from './components/Collection';
import { Search } from './components/Search';
import { Scanner } from './components/Scanner';
import { Sets } from './components/Sets';
import { SettingsPage } from './components/SettingsPage';
import { CardModal } from './components/CardModal';
import { SealedModal } from './components/SealedModal';
import { Icon } from './components/Icon';

type Tab = 'home' | 'collection' | 'scan' | 'search' | 'sets' | 'settings';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Portfolio', icon: 'portfolio' },
  { id: 'collection', label: 'Colección', icon: 'collection' },
  { id: 'scan', label: 'Escanear', icon: 'scan' },
  { id: 'search', label: 'Buscar', icon: 'search' },
  { id: 'sets', label: 'Expansiones', icon: 'sets' },
  { id: 'settings', label: 'Ajustes', icon: 'settings' },
];
const REFRESH_KEY = 'pokescan.lastRefresh';

export function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>(() => (location.hash.slice(1) as Tab) || 'home');
  const [card, setCard] = useState<{ card: Card; editing?: CollectionItem } | null>(null);
  const [sealed, setSealed] = useState<{ editing?: CollectionItem } | null>(null);
  const [set, setSet] = useState<CardSet | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const lang = store.settings.catalogLang ?? 'en';
  const setLang = (l: CatalogLang) => { store.setSettings(s => ({ ...s, catalogLang: l })); setSet(null); };
  const itemsRef = useRef(store.items); itemsRef.current = store.items;

  useEffect(() => { if (location.hash.slice(1) !== tab) location.hash = tab; window.scrollTo(0, 0); }, [tab]);
  // Back/forward buttons and links change the hash: follow them
  useEffect(() => {
    const onHash = () => { const t = location.hash.slice(1) as Tab; if (TABS.some(x => x.id === t)) { setTab(t); setCard(null); setSealed(null); } };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => setApiKey(store.settings.apiKey), [store.settings.apiKey]);

  // Daily value snapshot whenever values change
  useEffect(() => {
    if (!store.items.length) return;
    store.snapshot(
      Math.round(store.items.reduce((s, i) => s + itemValue(i, store.settings), 0) * 100) / 100,
      Math.round(store.items.reduce((s, i) => s + itemCost(i), 0) * 100) / 100,
    );
  }, [store.items, store.settings]);

  const refresh = useCallback(async () => {
    const ids = itemsRef.current.filter(i => i.card).map(i => i.card!.id);
    if (!ids.length) return;
    setRefreshing(true);
    const fresh = await refreshCards(ids);
    if (fresh.size) store.setItems(xs => xs.map(x => x.card && fresh.has(x.card.id) ? { ...x, card: fresh.get(x.card.id)! } : x));
    try { localStorage.setItem(REFRESH_KEY, new Date().toISOString().slice(0, 10)); } catch { /* ignore */ }
    setRefreshing(false);
  }, [store.setItems]);

  // Auto refresh prices once per day
  useEffect(() => {
    let last = ''; try { last = localStorage.getItem(REFRESH_KEY) ?? ''; } catch { /* ignore */ }
    if (last !== new Date().toISOString().slice(0, 10)) refresh();
  }, [refresh]);

  const openItem = (i: CollectionItem) => i.kind === 'sealed' ? setSealed({ editing: i }) : setCard({ card: i.card!, editing: i });

  return (
    <div className="app">
      <header className="top">
        <div className="brand" onClick={() => setTab('home')}><img src="./icon.svg" alt="" /> PokeScan</div>
        <nav className="top-nav">
          {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </nav>
      </header>

      <main>
        <h1 className="page-title">{TABS.find(t => t.id === tab)?.label}</h1>
        {tab === 'home' && <Dashboard store={store} onOpen={openItem} refreshing={refreshing} onRefresh={refresh} goSearch={() => setTab('search')} />}
        {tab === 'collection' && <Collection store={store} onOpen={openItem} onOpenCard={c => setCard({ card: c })} onAddSealed={() => setSealed({})} />}
        {tab === 'scan' && <Scanner store={store} onOpen={c => setCard({ card: c })} goSettings={() => setTab('settings')} />}
        {tab === 'search' && <Search store={store} onOpen={c => setCard({ card: c })} set={set} clearSet={() => setSet(null)} goSets={() => setTab('sets')} lang={lang} setLang={setLang} />}
        {tab === 'sets' && <Sets store={store} onPick={s => { setSet(s); setTab('search'); }} lang={lang} setLang={setLang} />}
        {tab === 'settings' && <SettingsPage store={store} />}
      </main>

      <nav className="bottom-nav">
        {TABS.filter(t => t.id !== 'sets').map(t => (
          <button key={t.id} className={`${tab === t.id ? 'on' : ''} ${t.id === 'scan' ? 'fab' : ''}`} onClick={() => setTab(t.id)}>
            <span className="ico"><Icon name={t.icon} size={t.id === 'scan' ? 26 : 22} /></span><span>{t.label}</span>
          </button>
        ))}
      </nav>

      {card && <CardModal key={card.card.id + (card.editing?.uid ?? '')} card={card.card} editing={card.editing} store={store} onClose={() => setCard(null)} />}
      {sealed && <SealedModal store={store} editing={sealed.editing} onClose={() => setSealed(null)} />}
    </div>
  );
}
