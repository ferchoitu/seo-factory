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

## Decisiones pendientes

Antes de escribir el primer artículo, Codex debe identificar:

- cómo separar formalmente el contenido editorial de las páginas programáticas;
- cómo se implementan canonical, metadata y schema;
- si el build de Vercel ejecuta `npm run build` directamente;
- cómo se deben integrar imágenes sin romper el objetivo de rendimiento;
- capturar y revisar el primer snapshot completo de URLs y canonicals.

## Próxima acción operativa

Auditar el repositorio completo en modo lectura y producir:

- mapa de carpetas;
- inventario de tipos de página;
- ubicación exacta de templates y metadata;
- propuesta de arquitectura para `/guides/`;
- checklist para crear una primera guía sin modificar datos de empresas;
- comandos de validación antes de publicar a `main`.

Hasta completar esa auditoría, todos los agentes permanecen desactivados para este sitio.

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
