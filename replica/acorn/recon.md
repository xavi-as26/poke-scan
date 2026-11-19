# Recon map: Acorn TCG — Pokémon card scanner & collection tracker (iOS / iPadOS / macOS)

Scope (proposed): the core loop — scan cards (one or many), see reference and graded prices, organise them in collections, track the portfolio and set completion. Rebuilt as the web PWA PokeScan.
For: the user's own product.
Date: 2026-11-18

> **Evidence limits.** acorntcg.com and apps.apple.com are blocked in this session, so nothing was read directly and no screenshots were taken. Everything comes from search-result summaries of the sources below; the FAQ text came back partly garbled. Screens are inferred and carry a confidence. Re-run with those hosts allowed, or drop screenshots from your own phone into `replica/acorn/screens/`.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site | https://www.acorntcg.com/ | "scan Pokémon cards with your iPhone, organise your collection and check reference prices" |
| 2 | FAQ | https://www.acorntcg.com/faq | Western languages + Japanese; custom collections; variants and master sets; Portfolio pinned at the top of My Collections; graded prices (PSA, Beckett, TAG, CGC…); Pro includes custom app icons; identifies but does not authenticate or grade |
| 3 | App Store (US) | https://apps.apple.com/us/app/acorn-tcg-card-scanner-app/id6740246597 | multi-card scanner; choose when graded prices appear in the scanner; value history 7 days–1 year; 40,000+ cards (v2.0); 17 UI languages; iPhone, iPad, Apple-silicon Mac; ~4.8★ from ~15.8K ratings |
| 4 | App Store (XK) | https://apps.apple.com/xk/app/acorn-tcg-card-scanner-app/id6740246597 | v2.2.1 (18 Sept): refreshed UI, graded-price setting for the scanner |
| 5 | App Store reviews | https://apps.apple.com/us/app/acorn-tcg-card-scanner-app/id6740246597?see-all=reviews&platform=iphone | praise: scanner accuracy and speed; complaints: slow in poor light, subscription not recognised after paying, bugs, restrictive paywall |
| 6 | BinderDex comparison | https://www.binderdex.com/blog/pokemon-card-scanner-apps-compared | (third party) free plan: 1 custom collection, 50 cards; Pro: unlimited scans, storage, collections, CSV import/export |
| 7 | mwm.ai | https://mwm.ai/apps/acorn-tcg-card-value-scanner/6740246597 | aggregate: 4.7★ / ~29K ratings; paywall is the main complaint |

Pricing seen: Acorn Pro weekly $7.99, annual, lifetime $99.99 (annual figure conflicts between listings). Built by a solo developer.

## Core loop

Point the camera at one or several cards, get their reference (and optionally graded) prices, save them to a collection, and watch the portfolio and set completion grow.

## Screens

| ID | screen | how you get there | purpose | key components | states | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | Scanner | main tab | identify cards live, one or many | camera, card outlines, result chips with price, graded toggle | no permission, scanning, matches, no match, poor light | high |
| S02 | Scan results / tray | after scanning | review matches, fix variant, add to a collection | result list, variant picker, collection picker | 1 / many / none | medium |
| S03 | Card detail | tap a card | reference price, graded prices per grader, variants, add | image, price rows, grader tabs | no price, graded | high |
| S04 | My Collections | tab | list of collections with pinned Portfolio row on top | collection rows, value, count | empty (free: 1 collection) | high |
| S05 | Portfolio | pinned row | all cards together, value history 7D–1Y | value header, chart, range tabs, card grid | first day | high |
| S06 | Collection detail | tap a collection | cards in a collection, sort/filter | grid, sort | empty, filled | medium |
| S07 | Sets / set detail | catalogue | set completion, master set by variant | set list, progress, card grid with variant ticks | — | medium |
| S08 | Search | catalogue | find any of 40k+ cards | search field, filters | none | medium |
| S09 | Settings | tab | language, currency, graded-in-scanner toggle, app icon, import/export | list | — | medium |
| S10 | Paywall | after free limit | Pro weekly/annual/lifetime, restore | plans | — | high |

## Flows

```
F01 Scan and save cards       S01 -> S02 -> pick collection -> S04/S06     clicks: ~2–3
    edge: poor lighting (reviews), Japanese card, wrong variant, free scan limit -> S10
F02 Check a card's graded value   S01/S08 -> S03 (grader tabs)
F03 Complete a set / master set   S07 -> missing cards / missing variants -> S03 -> add
F04 Track portfolio               S04 -> S05 (7D…1Y)
F05 Organise collections          S04 -> new collection -> S06
F06 Import / export CSV           S09
```

## Components

| component | variants | used on |
| --- | --- | --- |
| Camera with card outlines | single, multi | S01 |
| Result chip / row | price only, price + graded | S01 S02 |
| Collection row | Portfolio (pinned), custom | S04 |
| Value chart + range tabs | 7D 1M 3M 6M 1Y | S05 |
| Card grid tile | owned, missing, variant ticks | S05 S06 S07 S08 |
| Grader price table | PSA, BGS, CGC, TAG… by grade | S03 |
| Progress bar | set, master set | S07 |
| Paywall plan cards | weekly, annual, lifetime | S10 |

## Inferred data model

```
Card          id, name, number, set_id, language, variants[]                    high
Set           id, name, series, total, release_date                             high
Price         card_id, variant, source, value, currency, date                   medium
GradedPrice   card_id, grader (PSA|BGS|CGC|TAG|…), grade, value, date           medium (FAQ)
Collection    id, user_id, name, pinned (portfolio = virtual union)             high
CollectionItem collection_id, card_id, variant, quantity, condition?, price?    medium
ValueSnapshot date, value                                                       high (7D–1Y history)
User/Plan     plan (free|pro), scans_today, icon                                medium
```

## Out of scope

- Custom app icons (not possible for a web app).
- The Pro paywall and its limits: decided in /replica-launch.
- Acorn's own recognition model and price database.

## Size

Screens 10, flows 6, entities 8. Hard parts: master sets (needs the list of variants that exist per card), graded prices for several graders (no free data source), UI translation into many languages. Size on top of the current PokeScan: **S–M**.
