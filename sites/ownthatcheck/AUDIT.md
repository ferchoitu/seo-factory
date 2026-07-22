# OwnThatCheck — auditoría inicial

## Identificación

- Dominio: `ownthatcheck.com`
- Repositorio: `ferchoitu/ownthatcheck`
- Tipo: calculadoras financieras interactivas (Next.js) + blog editorial
- Mercado: Estados Unidos
- Nicho: nómina, impuestos, préstamos, retiro, negociación salarial

## Arquitectura confirmada

Next.js 15 App Router desplegado en Vercel (SSR/ISR, no static export). No genera
un `dist/` estático inspeccionable — a diferencia de verifiedtitles, el inventario
de URLs no puede basarse en un árbol de HTML local.

Dos tipos de página conviven en el mismo repo, con requisitos muy distintos:

```text
Calculadoras (50+)                      Blog (contenido editorial)
src/components/calculators/{name}/      src/components/blog/articles/{slug}.tsx
src/app/[locale]/{name}-calculator/     src/lib/data/blog-posts.ts (metadata)
  ├── page.tsx                            src/app/[locale]/blog/page.tsx (índice)
  └── [state]/page.tsx (51 URLs/calc)     src/app/[locale]/blog/[slug]/page.tsx
```

Las calculadoras dependen de motores de cálculo fiscal reales
(`src/lib/calculations/federal-income-tax.ts`,
`src/lib/data/federal-tax-2026.ts`, `src/lib/data/us-states.ts`) — son código, no
contenido editorial, y quedan completamente fuera del alcance de SEO Factory.

Publicar un post de blog nuevo requiere, según el propio `CLAUDE.md` del repo:

1. Entrada de metadata en `src/lib/data/blog-posts.ts`.
2. Componente del artículo en `src/components/blog/articles/{slug}.tsx`.
3. Registro del componente en `src/components/blog/articles/index.tsx`.
4. (Manual, fuera del agente) entrada en `src/app/sitemap.ts` y `public/llms.txt`.

Comandos relevantes:

```bash
npm run build   # tsc + next build — también valida tipos
npm run lint
npm run dev
```

## Fortalezas

- `CLAUDE.md` y `llm-seo-guidelines.md` ya documentan convenciones estrictas de
  SEO técnico (JSON-LD, QuickAnswer, FAQs mínimas) — el sitio ya tiene un
  estándar de calidad alto que el contenido editorial debe igualar.
- Separación de responsabilidades clara en el código: cálculo (`src/lib/calculations`),
  datos fiscales (`src/lib/data`), UI de calculadoras y blog viven en carpetas
  distintas — facilita declarar `editable_content_paths` sin ambigüedad.
- `npm run build` corre TypeScript type-checking, así que un componente de
  artículo con errores de sintaxis o props mal tipadas rompe el build antes de
  llegar a producción.

## Riesgos

Este sitio calcula cifras de plata real (retención, take-home pay, cuotas de
préstamo) — YMYL elevado, aunque el vector de riesgo es distinto al de
verifiedtitles: acá no hay licencias que verificar, hay **cifras impositivas y
tasas** que no deben inventarse ni quedar desactualizadas.

No se debe:

- inventar brackets impositivos, tasas de FICA, o límites de contribución;
- restatear una cifra fiscal de memoria en vez de leer `federal-tax-2026.ts` o
  citar la fuente primaria (IRS, agencia estatal) con fecha;
- tocar `src/lib/calculations/`, `src/lib/data/federal-tax-2026.ts`,
  `src/lib/data/us-states.ts`, ni ningún archivo bajo `src/components/calculators/`;
- tocar `src/app/sitemap.ts` ni `public/llms.txt` — compartidos con las
  calculadoras, protegidos por diseño (ver nota de workflow abajo).

### Nota de workflow: sitemap.ts protegido

Como `sitemap.ts` está protegido, un post nuevo **no aparece en el sitemap.xml
en vivo** hasta que un humano agregue la entrada a mano. Por eso el inventario
de URLs de este sitio no usa `inventory:live` (basado en sitemap) como
verifiedtitles, sino `inventory:ts-registry`, que lee los slugs directamente de
`src/lib/data/blog-posts.ts` en el checkout local — no depende del deploy de
Vercel ni del sitemap. Ver `repository_contract.url_inventory_command` en
`config.yaml`.

Consecuencia operativa: después de cada publicación automática, alguien debe
agregar la URL nueva a `sitemap.ts` y `public/llms.txt` a mano para que quede
indexable. Mientras eso no esté resuelto con un paso automatizado propio, no
asumir que un post publicado por el pipeline ya es rastreable por Google.

## Receta del Writer (create_article)

Confirmada al publicar el primer lote de 2 posts (2026-07-21). Un Writer —
humano o agente — debe seguir esto exactamente. A diferencia de
verifiedtitles, acá se tocan **tres archivos por post**, no uno:

1. Clonar `ferchoitu/ownthatcheck` en `main`, checkout limpio.
2. Metadata: agregar una entrada a `BLOG_POSTS` en `src/lib/data/blog-posts.ts`
   (`slug`, `title`, `description`, `excerpt`, `category`, `datePublished`,
   `dateModified`, `readTimeMinutes`). `title` 30-60 caracteres, `description`
   120-160.
3. Contenido: crear `src/components/blog/articles/{slug}.tsx` — export default
   un componente `Article` (JSX con clases Tailwind del sitio: `card`,
   `text-text-primary`, `text-text-secondary`, etc.) y un export nombrado
   `faqs` (array `{ q, a }`, 6-8 preguntas). Usar
   `src/components/blog/articles/what-is-fica.tsx` como plantilla de
   referencia — mismo patrón de `<QuickAnswer>`, secciones `<h2>`, tarjetas
   `.card`, y `<Link>` de `next/link` para enlaces internos (nunca `<a>`, el
   lint del repo lo rechaza).
4. Registro: en `src/components/blog/articles/index.tsx`, importar el
   componente + `faqs` nuevo, y agregar una entrada al objeto `ARTICLES` con
   `Body`, `faqs`, `ctaHeading`, `ctaSubtext`, `relatedTools` (array de
   `{ href, title, desc }` apuntando a calculadoras relevantes existentes).
5. **Regla de escape obligatoria del repo**: todo apóstrofe dentro de texto
   JSX (no dentro de un string de `faqs`) debe ser `&apos;`, nunca `'` — el
   ESLint del repo (`react/no-unescaped-entities`) rompe el build si no.
6. `path`/URL final es `/blog/{slug}/`. Único `allowed_new_content_roots`.
7. **`sitemap.ts` y `public/llms.txt` nunca se tocan** — están protegidos
   (ver nota arriba). El Writer no debe intentar editarlos ni el
   `technical_validation` los va a aceptar como `changed_files`.
8. Todo claim numérico (bracket, límite de contribución, tasa) necesita fuente
   primaria con fecha (IRS, agencia estatal, o — como con la regla de
   catch-up Roth de SECURE 2.0 — una fuente legal secundaria confiable si
   IRS.gov todavía no resumió la regla final). Cruzar contra
   `src/lib/data/federal-tax-2026.ts` (protegido, sólo lectura) en vez de
   restatear una cifra de memoria.
9. Verificación: `npm run lint` (cero errores en los archivos tocados) y
   `npm run build` (tsc + next build; debe generar
   `page_count` anterior + 1 rutas de blog vía `generateStaticParams`).
10. `optimize_existing_page` no está habilitada — los posts existentes son
    componentes TSX escritos a mano; un Writer automatizado sólo debe
    ejecutar `create_article` hasta que haya historial suficiente.

## Selección de tema (evitar canibalización)

Antes de research, el agente debe clonar el repo y revisar
`src/lib/data/blog-posts.ts` completo (slugs, títulos, categorías) — la lista
de `core_topics`/`approved_topics` en `config.yaml` es amplia (nómina,
impuestos, hipotecas, retiro, negociación salarial) y el blog ya tiene ~50
posts, así que un hueco real requiere leer lo que ya existe, no asumir a
partir de la categoría. Dos de las cuatro sugerencias originales de este
documento (créditos fiscales tipo EITC ya cubierto tangencialmente, y
deducciones pre-tax/post-tax) resultaron parcialmente pisadas al revisar el
archivo real — se descartaron antes de escribir.

Huecos confirmados sin cubrir todavía:

- Comparación de calculadoras: cuándo usar take-home pay vs. paycheck vs. net
  pay calculator (contenido de enlazado interno, no un tema nuevo de cero).
- W-2 vs. 1099 explicado en formato guía (existe la calculadora
  `/w2-vs-1099-calculator/` pero ningún post explicativo).
- Cómo se calcula el overtime (reglas FLSA de time-and-a-half).

## Publicado hasta ahora

- `/blog/how-are-bonuses-taxed/` — 2026-07-21.
- `/blog/traditional-vs-roth-401k/` — 2026-07-21.

Ambos publicados manualmente, sin pasar por `npm run pipeline` — ver
`sites/ownthatcheck/runs/2026-07-21-*.yaml`. La receta de arriba es la base
para automatizarlo con handoffs JSON reales.

## Próxima acción operativa

1. Conectar esta receta al pipeline real (`npm run pipeline -- init/submit/technical/package`
   + `npm run publisher`) con etapas independientes antes de habilitar una
   rutina programada sin supervisión. Ver
   `agents/ORCHESTRATOR_AGENT/AUTOMATED_RUN_PLAYBOOK.md`.
2. Agregar manualmente la URL de cada post publicado a `sitemap.ts` y
   `public/llms.txt` hasta que ese paso tenga su propio mecanismo seguro.
