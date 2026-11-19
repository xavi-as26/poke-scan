## Parity: 78.9 / 100

features 78.9  (27 counted, must-haves 11 of 12 done)

Not shippable yet: 1 must-have features are not done.

## By area, weakest first
- notifications                  0.0  (1 features)
- sharing                        0.0  (1 features)
- sealed                        30.0  (2 features)
- platform                      50.0  (1 features)
- prices                        58.3  (5 features)
- scanner                       80.0  (2 features)
- catalogue                     93.3  (6 features)
- portfolio                    100.0  (3 features)
- collection                   100.0  (3 features)
- graded                       100.0  (2 features)
- settings                     100.0  (1 features)

## Missing, in build order
- [must] sealed: Sealed products in collection, partial  (manual entry with own photo; no sealed catalogue or market price)
- [should] prices: Language-specific Cardmarket prices (DE IT ES FR), no  (pokemontcg.io only has EN aggregate)
- [should] prices: eBay sold prices where available, no  (needs eBay API with own key)
- [should] sealed: Sealed product catalogue with prices, no
- [should] catalogue: Multi-language cards (DE FR IT ES PT KR ZH), partial  (catalogue in DE FR IT ES PT via TCGdex; no KR ZH)
- [should] platform: Offline support, partial  (data local; no service worker so app shell needs network)
- [should] prices: Price history chart per card, partial  (only 30d/7d/1d/trend points from Cardmarket averages)
- [should] scanner: Scan identifies edition (1st edition / unlimited / reverse), partial  (AI reads edition and maps it to a price variant; not verified on real cards)
- [could] notifications: Notifications: new sets price changes value updates, no  (web push needs service worker + backend)
- [could] sharing: Share a card or a set, no

## Left out on purpose (not scored)
- Free tier with daily scan limit + Pro subscription: monetisation is decided in replica-launch not copied
- Native iOS app: clone is a web PWA by choice

## Yours, not in the original (not scored)
- Export collection to JSON / CSV
- Import collection from JSON
- Sample collection loader
