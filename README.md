# PokeScan

App web (PWA, móvil primero) para gestionar una colección de cartas Pokémon TCG como un portfolio, inspirada en las funciones de apps como Pokefolio.

## Funciones
- **Portfolio**: valor total, ganancia/pérdida frente al coste, gráfica de evolución (7D/1M/3M/1A/Todo), desglose por cartas, gradeadas y sellado, cartas más valiosas y mayores movimientos.
- **Escáner**: cámara del móvil (o foto) + OCR (tesseract.js) que lee el nombre y el número de la carta y busca coincidencias.
- **Búsqueda** por nombre y número, y **expansiones** con progreso de colección por set.
- **Precios** de Cardmarket (EUR) y TCGplayer (USD) vía [pokemontcg.io](https://pokemontcg.io), con fuente y moneda configurables y actualización diaria automática.
- **Cartas gradeadas** (PSA, BGS, CGC, SGC, TAG, ACE + nota y nº de certificado), **producto sellado** con foto, variante, estado, idioma, precio de compra y valor manual.
- **Lista de deseos**, exportación JSON/CSV, importación JSON, y datos de ejemplo.
- Funciona sin conexión a la API con cartas de ejemplo (precios ilustrativos).

Los datos se guardan en `localStorage` del navegador.

## Desarrollo
```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción en dist/
```

App no oficial, sin relación con Nintendo, Creatures, GAME FREAK ni The Pokémon Company.
