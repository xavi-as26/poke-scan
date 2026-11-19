# Recon map: Mint — Pokémon Card Scanner & Price Tracker (iOS)

Scope: the core loop — scan cards (one or a whole binder page), see prices, track the portfolio; plus binders, alerts and the AI grading assistant.
For: the user's own product (PokeScan, a web PWA).
Date: 2026-11-15

> **Evidence limits.** getmint.app and apps.apple.com are blocked in this session. Everything comes from search-result summaries of the pages below; no screenshots. Screens are inferred and carry a confidence.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site | https://www.getmint.app/ | free iPhone/iPad app, iOS 26+; Mint Pro $3.99/mo or $24.99/yr |
| 2 | FAQ | https://www.getmint.app/faq/ | Deck Sweep; on-device recognition (Apple Vision); AI grade estimate from photos; no account needed |
| 3 | press kit | https://www.getmint.app/press/ | Deck Sweep, portfolio, price alerts, binders; free 20 scans/month (other listings say unlimited) |
| 4 | sets page | https://www.getmint.app/sets/ | all sets with per-set prices, public web |
| 5 | privacy | https://www.getmint.app/privacy/ | iCloud storage; portfolio data also on their servers |
| 6 | App Store (US) | https://apps.apple.com/us/app/mint-for-pok%C3%A9mon-tcg/id6751779804 | widgets, sealed, price alerts, Japanese cards, custom binders; free limit 200 or 500 cards depending on listing; 4.4★ / 10 ratings |
| 7 | App Store (PL) | https://apps.apple.com/pl/app/trading-card-scanner-mint/id6751779804 | 1 review, 1★: "So slow" |
| 8 | 9to5Mac | https://9to5mac.com/2025/11/22/indie-app-spotlight-mint-pokemon-collection-tracker/ | 90-day price history charts, CardMarket + TCGplayer |

Not the same product: "Mint TCG" on Google Play, Intuit Mint, Mint Mobile.

## Core loop

Sweep a binder page with the camera, every card is identified and priced at once, and the portfolio total updates.

## Screens

| ID | screen | purpose | key components | confidence |
| --- | --- | --- | --- | --- |
| S01 | Portfolio | total value, change, history | value header, chart, top cards | high |
| S02 | Scanner (single) | identify one card | camera, frame, result card | high |
| S03 | Deck Sweep | identify many cards in one frame | camera, per-card overlays, add-all | high |
| S04 | Card detail | prices, 90-day chart, rarity, set, add, alert | chart, price rows, bell | high |
| S05 | Binders | user-made groups of cards | binder list, binder grid | high |
| S06 | Sets | all sets with prices, completion | set list, set value | high |
| S07 | Sealed | sealed products and values | list | medium |
| S08 | Price alerts | alerts set per card | list, threshold editor | medium |
| S09 | AI grading | photos front/back -> estimated grade | camera guide, centering/corners/edges/surface report | medium |
| S10 | Profile | public collection profile | avatar, showcase | guess |
| S11 | Paywall | Mint Pro | plans | high |
| S12 | Widgets | home screen value / set prices | — | high (iOS only) |

## Flows

```
F01 Sweep a binder page          S03 -> review matches -> add all -> S01     clicks: ~2
F02 Scan one card                S02 -> S04 -> add                           clicks: ~2
F03 Set a price alert            S04 -> S08
F04 Estimate a grade             S04/S09 -> photo front -> photo back -> report
F05 Organise into binders        S05 -> new binder -> add cards
F06 Track value                  S01
```

## Inferred data model

```
Card, Set, Price (daily, 90 days)                       confidence: high
CollectionItem  card_id, binder_id?, quantity, condition, purchase_price   medium
Binder          id, name, cover                          high
PriceAlert      card_id, direction, threshold            medium
GradeEstimate   card_id, photos, sub-scores, grade       medium
SealedProduct   id, name, set_id, price                  medium
```

## Out of scope

- Home screen widgets (native iOS only).
- Their recognition model and price database; use public data and our own matching.
- Pro paywall: decided in /replica-launch.

## Size

Screens 12, flows 6, entities 6. Hard parts: multi-card detection (Deck Sweep), image-based recognition, AI grading (needs a vision model and honest disclaimers), price history + alerts (need a backend). Size: **M–L**.
