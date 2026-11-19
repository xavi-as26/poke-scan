export type Currency = 'EUR' | 'USD';
export type PriceSource = 'cardmarket' | 'tcgplayer';

export interface TcgPrice { low?: number; mid?: number; high?: number; market?: number; directLow?: number }
/** Catalogue language. 'en' uses pokemontcg.io, the rest use TCGdex. */
export type CatalogLang = 'en' | 'ja' | 'es' | 'fr' | 'de' | 'it' | 'pt';

export interface Card {
  id: string;
  lang?: CatalogLang;
  /** true when only the search summary was loaded (no prices yet) */
  partial?: boolean;
  name: string;
  number: string;
  rarity?: string;
  supertype?: string;
  types?: string[];
  artist?: string;
  hp?: string;
  set: { id: string; name: string; series: string; printedTotal: number; total?: number; releaseDate: string; rank?: number; images?: { symbol: string; logo: string } };
  images: { small: string; large: string };
  tcgplayer?: { url?: string; updatedAt?: string; prices?: Record<string, TcgPrice> };
  cardmarket?: { url?: string; updatedAt?: string; prices?: Record<string, number> };
}
export interface CardSet {
  id: string; name: string; series: string; printedTotal: number; total: number; releaseDate: string;
  /** chronological position (higher = newer) when the source has no per-set date */
  rank?: number;
  images: { symbol: string; logo: string };
}

export type Condition = 'M' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO';
export type Variant = 'normal' | 'holofoil' | 'reverseHolofoil' | '1stEditionHolofoil' | '1stEditionNormal' | 'unlimitedHolofoil';
export type GradingCompany = 'PSA' | 'BGS' | 'CGC' | 'SGC' | 'TAG' | 'ACE';

export interface CollectionItem {
  uid: string;
  kind: 'card' | 'graded' | 'sealed';
  addedAt: string;
  quantity: number;
  purchasePrice?: number; // per unit, in user currency
  manualValue?: number;   // per unit override, in user currency
  notes?: string;
  binderId?: string;
  // card + graded
  card?: Card;
  variant?: Variant;
  condition?: Condition;
  language?: string;
  // graded
  company?: GradingCompany;
  grade?: string;
  cert?: string;
  // sealed
  sealedName?: string;
  sealedType?: string;
  sealedImage?: string;
}

export interface Binder { id: string; name: string; color: string }

export interface ValueSnapshot { date: string; value: number; cost: number }

export interface Settings {
  currency: Currency; source: PriceSource; apiKey?: string;
  catalogLang?: CatalogLang;
  /** user's own Anthropic API key, used only by the AI scanner, stored in this browser */
  anthropicKey?: string;
  /** 'fast' = Claude Haiku 5.5, 'accurate' = Claude Opus 5.5 */
  aiSpeed?: 'fast' | 'accurate';
  /** user's own PriceCharting API token, for real PSA 10 / PSA 9 prices */
  pricechartingToken?: string;
}
