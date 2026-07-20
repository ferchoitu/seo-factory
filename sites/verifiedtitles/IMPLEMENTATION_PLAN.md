# Plan de implementación editorial para Verified Titles

## Decisión

Verified Titles ya genera artículos informacionales desde `src/content/articles.js` y guías estatales desde `src/content/state-guides.js`. No se migrarán las URLs existentes porque un cambio de ruta podría perder señales SEO, enlaces y tráfico.

El hub editorial `/guides/` ya existe en `src/content/articles.js` y enlaza:

- artículos informacionales existentes;
- guías de title insurance por estado;
- futuros artículos editoriales.

## Arquitectura objetivo

```text
Home
├── Title companies
│   └── State → City → Company
└── Guides
    ├── Core guides
    ├── Comparisons
    ├── Costs and closing
    └── State title insurance guides
```

## Implementación técnica

1. Mantener `/guides/` y todas las rutas existentes.
2. Confirmar que Guides aparece en navegación principal y footer.
3. Confirmar que `/guides/` aparece en el sitemap generado por `writePage`.
4. Ejecutar el build completo.
5. Inventariar `dist/**/index.html` antes y después de cada cambio.
6. Comparar canonicals, breadcrumb schema y Article schema.

## Reglas editoriales

- No publicar cifras de costos sin fecha, jurisdicción o fuente adecuada.
- No presentar información general como asesoramiento legal.
- No afirmar que una empresa está licenciada salvo coincidencia determinística con fuente oficial.
- No crear páginas estatales genéricas sin diferencias regulatorias reales.
- Cada artículo debe enlazar al directorio cuando ayude al usuario.

## Primera tanda recomendada

1. What Does a Title Company Do?
2. Title Search vs. Title Insurance
3. Owner's vs. Lender's Title Insurance
4. How to Choose a Title Company
5. Who Chooses the Title Company?
6. What Happens During a Title Search?

## Criterio de aprobación

La sección se considera lista cuando:

- `/guides/` aparece en navegación y sitemap;
- el build termina sin errores;
- no cambia ninguna URL existente;
- todas las páginas tienen canonical, title y description;
- el hub enlaza a todas las guías publicadas;
- no se modifica la lógica de verificación de licencias.
