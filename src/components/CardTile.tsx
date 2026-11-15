import type { Card, Settings } from '../types';
import { cardPrice, fmt } from '../prices';

export function CardTile({ card, settings, onClick, badge }: { card: Card; settings: Settings; onClick: () => void; badge?: string }) {
  return (
    <button className="tile" onClick={onClick}>
      <div className="tile-img">
        <img src={card.images.small} alt={card.name} loading="lazy" />
        {badge && <span className="tile-badge">{badge}</span>}
      </div>
      <div className="tile-name">{card.name}</div>
      <div className="tile-meta">{card.set.name} · {card.number}/{card.set.printedTotal}</div>
      <div className="tile-price">{fmt(cardPrice(card, settings), settings.currency)}</div>
    </button>
  );
}
