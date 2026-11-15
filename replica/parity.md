## Parity: 65.6 / 100

features 65.6  (27 counted, must-haves 10 of 12 done)

Not shippable yet: 2 must-have features are not done.

## By area, weakest first
- notifications                  0.0  (1 features)
- sharing                        0.0  (1 features)
- scanner                       30.0  (2 features)
- sealed                        30.0  (2 features)
- platform                      50.0  (1 features)
- prices                        58.3  (5 features)
- collection                    71.4  (3 features)
- catalogue                     73.3  (6 features)
- graded                        80.0  (2 features)
- portfolio                    100.0  (3 features)
- settings                     100.0  (1 features)

## Missing, in build order
- [must] scanner: Camera scan identifies card name and set, partial  (OCR reads name + number then searches; no image recognition; misses edition and set symbol)
- [must] sealed: Sealed products in collection, partial  (manual entry with own photo; no sealed catalogue or market price)
- [should] catalogue: Japanese card support, no  (pokemontcg.io has no JP; TCGdex does)
- [should] collection: Multiple collections / binders, no  (folder field exists but unused in UI)
- [should] prices: Language-specific Cardmarket prices (DE IT ES FR), no  (pokemontcg.io only has EN aggregate)
- [should] prices: eBay sold prices where available, no  (needs eBay API with own key)
- [should] scanner: Scan identifies edition (1st edition / unlimited / reverse), no
- [should] sealed: Sealed product catalogue with prices, no
- [should] catalogue: Multi-language cards (DE FR IT ES PT KR ZH), partial  (language tag stored; no localized names or images)
- [should] catalogue: Set completion (what you still need), partial  (progress bar only counts loaded cards; no missing-cards filter)
- [should] graded: Graded market prices, partial  (estimated from raw price by multiplier or manual value)
- [should] platform: Offline support, partial  (data local; no service worker so app shell needs network)
- [should] prices: Price history chart per card, partial  (only 30d/7d/1d/trend points from Cardmarket averages)
- [could] notifications: Notifications: new sets price changes value updates, no  (web push needs service worker + backend)
- [could] sharing: Share a card or a set, no

## Left out on purpose (not scored)
- Free tier with daily scan limit + Pro subscription: monetisation is decided in replica-launch not copied
- Native iOS app: clone is a web PWA by choice

## Yours, not in the original (not scored)
- Export collection to JSON / CSV
- Import collection from JSON
- Sample collection loader
