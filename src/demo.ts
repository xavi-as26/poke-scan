// Offline sample data used when the Pokémon TCG API cannot be reached.
// Prices are illustrative only.
import type { Card, CardSet } from './types';

const img = (set: string, n: string) => ({
  small: `https://images.pokemontcg.io/${set}/${n}.png`,
  large: `https://images.pokemontcg.io/${set}/${n}_hires.png`,
});
const logo = (set: string) => ({
  symbol: `https://images.pokemontcg.io/${set}/symbol.png`,
  logo: `https://images.pokemontcg.io/${set}/logo.png`,
});

export const DEMO_SETS: CardSet[] = [
  { id: 'sv3pt5', name: '151', series: 'Scarlet & Violet', printedTotal: 165, total: 207, releaseDate: '2023/09/22', images: logo('sv3pt5') },
  { id: 'swsh7', name: 'Evolving Skies', series: 'Sword & Shield', printedTotal: 203, total: 237, releaseDate: '2021/08/27', images: logo('swsh7') },
  { id: 'base1', name: 'Base', series: 'Base', printedTotal: 102, total: 102, releaseDate: '1999/01/09', images: logo('base1') },
];
const S = Object.fromEntries(DEMO_SETS.map(s => [s.id, s]));

const mk = (set: string, n: string, name: string, rarity: string, eur: number, usd: number, types: string[] = []): Card => ({
  id: `${set}-${n}`, name, number: n, rarity, supertype: 'Pokémon', types,
  set: S[set], images: img(set, n),
  cardmarket: { prices: { trendPrice: eur, averageSellPrice: eur * 1.02, avg1: eur * 0.98, avg7: eur * 0.96, avg30: eur * 0.9, lowPrice: eur * 0.7 } },
  tcgplayer: { prices: { holofoil: { market: usd, low: usd * 0.75, mid: usd, high: usd * 1.6 } } },
});

export const DEMO_CARDS: Card[] = [
  mk('sv3pt5', '199', 'Charizard ex', 'Special Illustration Rare', 95, 110, ['Fire']),
  mk('sv3pt5', '25', 'Pikachu', 'Common', 0.4, 0.5, ['Lightning']),
  mk('sv3pt5', '151', 'Mew ex', 'Double Rare', 3.2, 3.8, ['Psychic']),
  mk('sv3pt5', '205', 'Mew ex', 'Hyper Rare', 18, 22, ['Psychic']),
  mk('swsh7', '215', 'Umbreon VMAX', 'Rare Secret', 1150, 1350, ['Darkness']),
  mk('swsh7', '218', 'Rayquaza VMAX', 'Rare Secret', 420, 480, ['Dragon']),
  mk('base1', '4', 'Charizard', 'Rare Holo', 380, 450, ['Fire']),
  mk('base1', '2', 'Blastoise', 'Rare Holo', 140, 165, ['Water']),
  mk('base1', '15', 'Venusaur', 'Rare Holo', 110, 125, ['Grass']),
  mk('base1', '58', 'Pikachu', 'Common', 6, 8, ['Lightning']),
];
