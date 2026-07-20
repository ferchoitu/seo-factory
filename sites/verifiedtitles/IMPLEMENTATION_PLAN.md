# Plan de implementación editorial para Verified Titles

## Decisión

Verified Titles ya genera artículos informacionales desde `src/content/articles.js` y guías estatales desde `src/content/state-guides.js`. No se migrarán las URLs existentes porque un cambio de ruta podría perder señales SEO, enlaces y tráfico.

Se añadirá un hub editorial en `/guides/` que enlace:

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

1. Crear `src/templates/guides-index.js`.
2. Generar `/guides/` desde `src/build.js`.
3. Añadir Guides a la navegación principal y al footer.
4. Mantener las rutas existentes de los artículos.
5. Añadir `/guides/` al sitemap mediante `writePage`.
6. Validar build completo.
7. Revisar canonicals, breadcrumb schema y Article schema.

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
