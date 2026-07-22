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

## Primer uso recomendado de SEO Factory

`automation.enabled: true` está activo desde el alta de este sitio (decisión
explícita del usuario, sin corridas manuales previas — a diferencia de
verifiedtitles). Sólo `create_article` está habilitado; `optimize_existing_page`
queda deshabilitado hasta que `create_article` tenga historial, porque los
posts existentes son componentes TSX escritos a mano, no HTML/JSON simple.

Contenido piloto sugerido (huecos reales en el blog actual, sin pisar los ~50
artículos existentes sobre nómina/hipotecas/impuestos):

1. Guía sobre créditos fiscales comunes (child tax credit, EITC) y cómo afectan
   el take-home pay — con fuente IRS.
2. Explicación de qué es un "exemption"/allowance en el W-4 actual (post-2020)
   vs. el modelo viejo.
3. Guía sobre deducciones pre-tax vs. post-tax más allá de 401(k)/HSA (FSA,
   commuter benefits).
4. Comparación de calculadoras: cuándo usar take-home pay vs. paycheck vs. net
   pay calculator (contenido de enlazado interno, no un tema nuevo de cero).

## Próxima acción operativa

Antes de la primera corrida real:

1. Confirmar que `npm run inventory:ts-registry -- --file src/lib/data/blog-posts.ts --url-prefix /blog/` corre limpio contra un checkout real de `ferchoitu/ownthatcheck` y que `page_count` coincide con la cantidad de posts listados en `/blog`.
2. Correr `npm run preflight -- ownthatcheck` y confirmar `ready`.
3. Ejecutar la primera corrida (`create_article`) y revisar el resultado antes de confiar en corridas sucesivas sin supervisión.
4. Agregar manualmente la URL publicada a `sitemap.ts` y `public/llms.txt` hasta que ese paso se automatice.
