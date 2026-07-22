# Verified Titles — auditoría inicial

## Identificación

- Dominio: `verifiedtitles.com`
- Repositorio: `ferchoitu/titlefinder`
- Tipo: directorio programático estático
- Mercado: Estados Unidos
- Nicho: title companies, escrow y real estate closing services

## Arquitectura confirmada

El proyecto usa un generador propio en Node.js. No depende de un framework con runtime en producción.

Flujo principal:

```text
dataset/*.json
  ↓ transform
 data/title_companies.json
  ↓ optional license enrichment
 data/title_companies_enriched.json
  ↓ build
 dist/*.html
  ↓ GitHub push
 Vercel deploy
```

Jerarquía SEO:

```text
Home → State hub → City hub → Company page
```

Comandos relevantes:

```bash
npm run transform
npm run build
npm run rebuild
npm run serve
npm run rebuild:licensed
```

## Fortalezas

- HTML estático y rápido.
- Arquitectura geográfica clara.
- URLs programáticas con intención local.
- Datos estructurados por empresa.
- Pipeline de enriquecimiento de licencias separado del generador.
- Política de coincidencia exacta para claims de licencia.
- Degradación segura cuando no existe verificación.

## Riesgos

Este sitio toca información vinculada con transacciones inmobiliarias, licencias y servicios financieros. Por eso cualquier afirmación sobre regulación, licencia, costos o requisitos estatales debe tratarse como contenido de precisión elevada.

No se debe:

- inventar licencias o estados de verificación;
- convertir coincidencias difusas en badges públicos;
- generar reseñas o experiencias falsas;
- presentar requisitos legales sin fuente estatal actualizada;
- publicar automáticamente cambios masivos en páginas de empresas.

## Primer uso recomendado de SEO Factory

No comenzar modificando las páginas programáticas existentes. El primer flujo debe probarse con una sección editorial independiente.

Contenido piloto recomendado:

1. Guía evergreen sobre qué hace una title company.
2. Explicación de title insurance.
3. Comparación entre title company, escrow company y closing attorney.
4. Guías estatales verificadas con fuentes oficiales.
5. Glosario de términos de cierre inmobiliario.

## Verificación adicional del generador

Una inspección en lectura de `ferchoitu/titlefinder` sobre `main` confirmó que
`src/build.js` centraliza todas las escrituras mediante `writePage`. Cada URL se
materializa como `dist/<ruta>/index.html`; la home usa `dist/index.html`.

El build genera páginas para home, índice de estados, estados, ciudades, empresas,
artículos, guías estatales, páginas legales y búsqueda. `/search/` es una página real
con `noindex`, por lo que debe incluirse en el inventario aunque no aparezca en sitemap.

También se confirmó que `/guides/` ya existe como artículo-hub declarado en
`src/content/articles.js`. No corresponde volver a crear esa URL ni migrarla.

## Receta del Writer (create_article)

Confirmada al publicar el primer lote de 5 guías (2026-07-21). Un Writer —
humano o agente — debe seguir esto exactamente:

1. Clonar `ferchoitu/titlefinder` en `main`, checkout limpio.
2. El único archivo que se edita es `src/content/articles.js`. Es un array
   `articles`; cada entrada es un objeto con `slug`, `path`, `h1`, `title`,
   `description`, `intro`, `faqs` (array de `{ q, a }`) y `body` (string HTML).
3. `path` de un artículo nuevo debe empezar con `/guides/` (único
   `allowed_new_content_roots`) y terminar en `/`. `slug` es el segmento final.
4. Agregar la entrada nueva justo antes del `];` de cierre del array. No
   reordenar ni tocar entradas existentes — eso sería `optimize_existing_page`,
   una operación distinta.
5. El `body` es HTML plano (no JSX): `<h2>`, `<p>`, `<ul>/<li>`, `<a href="...">`
   para links internos y externos. Sin clases CSS ni componentes — el layout
   lo pone la plantilla (`articleTpl` en `src/build.js`).
6. Agregar un link a la guía nueva en la sección "Go deeper" (o crear una si no
   existe) del hub `/guides/` (primera entrada del array `articles`), para que
   no quede huérfana.
7. Todo claim numérico o regulatorio necesita fuente primaria citada inline
   con `<a href="...">` (CFPB, NAIC, un regulador estatal, ALTA/Home Closing
   101). Nunca inventar cifras de costos, licencias o requisitos legales.
8. Build y verificación: `npm run build`; comparar el inventario de
   `dist/**/index.html` antes/después — debe crecer en exactamente 1 URL, cero
   URLs removidas, cero canonicals cambiados.
9. `optimize_existing_page` no está habilitada todavía en `automation.allowed_operations`
   para este sitio — un Writer automatizado sólo debe ejecutar `create_article`.

## Decisiones resueltas

- Contenido editorial vive enteramente en `src/content/articles.js` (single
  array), separado de `dataset/`/`data/` (datos de empresas, protegidos).
- El build de Vercel ejecuta `npm run build` directamente; no hay paso de
  transformación adicional para contenido editorial (a diferencia de
  `data/title_companies_enriched.json`, que sí depende de `npm run transform`
  y el pipeline de licencias).
- Imágenes: no se usan todavía en las guías (`images.provider: not_connected`
  en `config.yaml`); no bloquea `create_article`.
- El primer lote (5 guías, 2026-07-21) se publicó manualmente, sin pasar por
  `npm run pipeline` — ver `sites/verifiedtitles/runs/2026-07-21-*.yaml`. La
  receta de arriba es la base para automatizarlo con handoffs JSON reales.

## Próxima acción operativa

Conectar esta receta al pipeline real (`npm run pipeline -- init/submit/technical/package`
+ `npm run publisher`) con etapas independientes (Research, Writer, Editorial
Review, SEO Review como invocaciones separadas) antes de habilitar una rutina
programada sin supervisión. Ver `agents/ORCHESTRATOR_AGENT/AUTOMATED_RUN_PLAYBOOK.md`.

## Baseline reproducible de URLs

El 2026-07-20 se ejecutó `npm run build` desde un clon local limpio de `main`, sin
modificar el checkout original. El build utilizó
`data/title_companies_enriched.json` y produjo:

- 3.550 fichas de empresas;
- 10 hubs estatales;
- 827 hubs de ciudades;
- 4.401 páginas HTML totales;
- 4.400 URLs indexables distribuidas en 11 sitemaps hijos;
- `/search/` como página adicional con `noindex,follow`.

El inventario de `dist/**/index.html` confirmó:

- cero páginas sin canonical;
- cero canonicals que apunten a una ruta diferente;
- ninguna diferencia de rutas entre el `dist/` existente y el build limpio;
- el checkout original permaneció limpio en `main`.

Este baseline valida el mecanismo de inventario. La automatización continúa
desactivada hasta probar un cambio editorial manual con snapshots anterior y posterior.
