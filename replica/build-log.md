# Build log

Target: Mint (`replica/mint/recon.md`). Screenshots in `replica/mint/clone-screens/` at 390px and 1440px.

| ID | date | status | missing | harder than expected |
| --- | --- | --- | --- | --- |
| S05 Binders | 2026-11-15 | done | drag-and-drop reordering, binder covers | — |
| S06 Sets + set value | 2026-11-15 | done (EN) / partial (other languages) | set value in non-English catalogues: TCGdex has no bulk prices, so each card would need its own request | loading every card of a set instead of paged results |
| S04 Card detail (multi-language) | 2026-11-15 | done | KR / ZH catalogues | TCGdex search results have no prices; the card is loaded in full when opened or added |
| S03 Scanner + Deck Sweep | 2026-11-15 | done, verified with a mocked API | on-device image recognition; real-world accuracy not measured | the AI SDK tripled the bundle — moved to a lazy-loaded chunk (main JS 204 kB, AI 482 kB on demand) |

Notes
- TCGdex and the Anthropic API are blocked in the build sandbox; both were exercised end to end with mocked responses of the documented shape (Playwright, 390px and 1440px, no console errors). Needs a check against the real services.
- The AI scanner uses the user's own Anthropic key, stored only in their browser and sent only to api.anthropic.com (`dangerouslyAllowBrowser`). Model `claude-opus-5-5`, effort `low`, server-side refusal fallback on, structured output via Zod. Keys are excluded from JSON export.
- Not built yet (need a backend): price alerts, 90-day price history, sync across devices. Not built: AI grading assistant, public profile, AI market predictions.
| PSA 10 value | 2026-11-15 | done, verified with a mocked PriceCharting API | real prices need the user's paid PriceCharting token; without it the PSA 10 value is an estimate (raw × 4) | no free source of graded prices; PriceCharting's field names are legacy (manual-only-price = PSA 10) |
| Dark premium redesign | 2026-11-18 | done | real card art not visible in the sandbox (image host blocked) | — |
| Faster scanning | 2026-11-18 | done | real-world timings not measured (Anthropic API blocked in sandbox) | — |

Speed changes (2026-11-18): AI "Rápido" (Claude Haiku 5.5, default) / "Preciso" (Claude Opus 5.5) setting; single-card uploads capped at 1024px (page scans 1568px); catalogue lookups run 4 at a time and rows appear before matches finish; 5-minute search cache; OCR uses two preloaded workers in parallel; the AI module or OCR engine is preloaded when the scanner opens.
