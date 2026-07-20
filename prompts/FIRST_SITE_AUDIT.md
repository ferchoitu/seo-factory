# Prompt: auditoría inicial de un sitio

Usar este prompt dentro de Codex cuando se incorpore el primer repositorio real.

```text
Actuá como arquitecto de contenido y desarrollador senior.

Antes de modificar cualquier archivo:

1. Leé AGENTS.md, README.md y knowledge/SEO_RULES.md del repositorio SEO Factory.
2. Leé sites/<sitio>/config.yaml.
3. Inspeccioná completamente el repositorio del sitio objetivo.
4. No escribas artículos ni hagas cambios de producción todavía.

Documentá:

- framework y versión;
- estructura de rutas;
- ubicación de artículos y páginas;
- extensión de contenido usada;
- esquema real de frontmatter;
- componentes especiales disponibles en MD/MDX;
- categorías y tags existentes;
- generación de sitemap y metadata;
- manejo de imágenes;
- comandos de instalación, lint, test y build;
- integración con Vercel;
- proceso exacto para crear una página nueva;
- riesgos de romper el build;
- inconsistencias editoriales detectadas.

Creá un informe en sites/<sitio>/REPOSITORY_AUDIT.md.

Luego proponé los cambios mínimos para configurar el sitio dentro de SEO Factory, pero no los ejecutes sin aprobación.

No inventes información. Cuando algo no pueda verificarse, marcálo como pendiente.
```

## Resultado esperado

La auditoría debe permitir que una persona nueva agregue un artículo de prueba sin adivinar rutas, campos, componentes ni comandos.
