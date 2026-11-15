# Recon map: Pokefolio (iOS)

Scope: the core loop — scan or search a card, add it to a collection (raw, graded or sealed), see what the collection is worth over time. Rebuilt as a web PWA (PokeScan).
For: the user's own product, a Pokémon TCG portfolio tracker that runs in any browser.
Date: 2026-11-15

> **Evidence limits.** This session's network blocks pokefolio.app, apps.apple.com and mwm.ai, so no page was read directly and no screenshots were taken. Everything below comes from search-result summaries of the sources listed. Screens are inferred from the listing's feature text and are marked with a confidence. Re-run this recon with those hosts allowed (or with screenshots from the user's own phone in `replica/screens/`) before trusting layout details.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site | https://www.pokefolio.app/ | blocked; via search: scanner, Cardmarket + TCGplayer prices, price charts, value history, notifications (new sets, price changes, value) |
| 2 | terms | https://www.pokefolio.app/terms | freemium; "Pokefolio Pro" auto-renewing subscription |
| 3 | App Store (US) | https://apps.apple.com/us/app/pokefolio-tcg-collector/id6746367159 | blocked; via search: scan identifies set, name, edition; eBay sold prices; sealed + graded; developer Marius Eckerle; 4.8★ / 31 ratings in one region |
| 4 | App Store (FR) | https://apps.apple.com/fr/app/pokefolio-pokemon-tcg/id6746367159?l=en-GB | developer reply: free limit moved from monthly to daily scans; Pro removes scan and collection limits; older reviews mention 10 scans/month and 50 cards |
| 5 | App Store version history | https://apps.apple.com/us/app/pokefolio-for-pokemon-tcg/id6746367159 | v2.0 (2025-11-27): new pricing system, graded prices, card + set sharing, Japanese cards, offline support; 2.1.x early 2026 |
| 6 | CollectHolo roundup | https://www.collectholo.com/best-pokemon-card-trackers | multi-language scanner; iOS only; Cardmarket/TCGplayer/eBay |
| 7 | mwm.ai listing | https://mwm.ai/apps/pokefolio-for-pokemon-tcg/6746367159 | blocked; via search: price charts, historical prices, collection value changes |

Not the same product (excluded): pokefolio.eu (a separate "PokéFolio" binder manager), TCG Portfolio (Google Play).

## Core loop

Point the camera at a card, get its market value, add it to your collection, and watch the total value move.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | Onboarding | first launch | explain scan + portfolio, pick currency/language | pager, CTA | — | guess |
| S02 | Portfolio / home | tab | total value, change, value chart, top cards | value header, line chart, range tabs, card strip | empty, filled | high |
| S03 | Scanner | tab / FAB | live camera identifies card | camera view, card frame guide, shutter | no permission, scanning, match, no match | high |
| S04 | Scan result | after scan | confirm match, pick variant, add | match list, variant picker | one match, many, none | medium |
| S05 | Card detail | tap any card | prices per source, price chart, graded prices, add | image, price table, chart, add button | no price, raw, graded | high |
| S06 | Add to collection | from S04/S05 | quantity, condition, language, purchase price, collection | form sheet | — | medium |
| S07 | Collection | tab | everything owned, filter/sort, multiple collections/binders | grid/list, filters, collection switcher | empty, filled | medium |
| S08 | Sets | tab or search | browse sets by series | set grid, logos | — | high |
| S09 | Set detail | tap set | cards in set, owned vs missing, completion | card grid, progress | — | medium |
| S10 | Search | tab | find any card by name/number | search field, results grid | empty, loading, none | high |
| S11 | Sealed products | from S07/search | browse and add sealed items with values | product list, price | — | medium |
| S12 | Graded entry | from S05/S06 | company + grade, graded value | company/grade pickers | — | medium |
| S13 | Wishlist | from S07 | cards wanted | grid | empty, filled | medium (third-party mention) |
| S14 | Settings | tab | currency, price source, language, Pro, notifications | list | — | medium |
| S15 | Paywall | after free limit | sell Pro | plan cards, restore | — | high |
| S16 | Share sheet | from S05/S09 | share card or set | system share | — | high (v2.0 notes) |

## Flows

```
F01 Scan a card and add it
    S03 -> S04 -> S06 -> S02
    happy path clicks: ~3 (shutter, pick match, add)
    edge: no camera permission, bad light, card not in DB, daily scan limit hit (-> S15), Japanese card

F02 Find a card by search and add it
    S10 -> S05 -> S06
    happy path clicks: ~3 + typing
    edge: no results, many printings with same name, no price

F03 Add a graded card
    S10/S03 -> S05 -> S12 -> S06
    edge: no graded price for that grade

F04 Add a sealed product
    S07 -> S11 -> S06

F05 Check portfolio value and change
    S02 (range tabs)
    edge: empty collection, first day (no history)

F06 Complete a set
    S08 -> S09 (missing filter) -> S05 -> S06

F07 Share a card or set
    S05/S09 -> S16
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Card tile | grid, strip, list row | default, owned badge, qty | S02 S07 S09 S10 |
| Price row | per source, per variant | value, no price | S05 |
| Line chart | portfolio, card | empty, hover | S02 S05 |
| Range tabs | 7D 1M 3M 1Y All | selected | S02 S05 |
| Camera frame | — | idle, scanning, matched | S03 |
| Bottom sheet form | add, edit | — | S06 S12 |
| Segmented control | raw/graded | — | S06 |
| Tab bar with centre scan button | — | active | all |
| Progress bar | set completion | — | S08 S09 |
| Paywall card | monthly, yearly | — | S15 |

## Inferred data model

```
Card         id, name, number, set_id, rarity, images, variants, language
             evidence: S05, listing ("set, name, edition")          confidence: high
Set          id, name, series, total, release_date, logo
             evidence: S08, "new sets" notifications               confidence: high
Price        card_id, source (cardmarket | tcgplayer | ebay), variant, language?, grade?, value, currency, date
             evidence: listing, v2.0 "graded prices", per-language Cardmarket   confidence: medium
CollectionItem  id, collection_id, kind (card | graded | sealed), card_id | product_id,
             quantity, condition, language, variant, purchase_price, company?, grade?
             evidence: listing (purchase price, graded, sealed)    confidence: medium
Collection   id, user_id, name                                    confidence: guess (binders mentioned by third party)
SealedProduct id, name, type, set_id, image, price                 confidence: medium
ValueSnapshot collection_id, date, value                          confidence: medium ("value over time")
User         id, plan (free | pro), scans_today                   confidence: medium (daily scan limit)
```

Relationships: User 1-n Collection, Collection 1-n CollectionItem, CollectionItem n-1 Card | SealedProduct, Card n-1 Set, Card 1-n Price.

## Feature matrix

See `features.csv`. Must: 12, should: 15, could: 5 (3 ours), skip: 2.

## Out of scope (cannot or should not be cloned)

- The original's own card recognition model and its price database: use public sources (pokemontcg.io, TCGdex, eBay API with own key).
- Card images and names belong to The Pokémon Company; use them only via the public API, never bundle them.
- The Pro paywall and its limits: business model is decided in /replica-launch.
- Native iOS app: the clone is a PWA by choice.

## Size

Screens 16, flows 7, entities 8. Hard parts: reliable card recognition (image matching, not just OCR), multi-language + Japanese data, price history (needs a backend that stores prices daily), push notifications. Size: **M** (a few weeks) to reach parity on top of the current PokeScan.
