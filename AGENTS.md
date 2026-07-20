# Instrucciones maestras para Codex

## Misión

Ayudar a construir y operar SEO Factory como un sistema central, modular y auditable para múltiples sitios web.

## Reglas obligatorias

1. Leer `README.md`, este archivo y la documentación relevante antes de modificar el repositorio.
2. No automatizar un flujo que todavía no haya sido validado manualmente.
3. No publicar directamente en los repositorios de producción sin una instrucción explícita.
4. Preferir ramas y pull requests para cambios editoriales, estructurales o masivos.
5. No inventar datos de volumen, dificultad, tráfico, ingresos, productos ni fuentes.
6. Distinguir claramente entre datos verificados, estimaciones e hipótesis.
7. Mantener una sola responsabilidad por agente.
8. Evitar contenido duplicado, páginas huérfanas y canibalización de keywords.
9. Respetar la configuración y la voz de cada sitio.
10. Registrar decisiones importantes y cambios de workflow.

## Secuencia de trabajo

Antes de ejecutar una tarea:

1. Identificar el sitio objetivo.
2. Leer `sites/<sitio>/config.yaml`.
3. Leer las reglas globales en `knowledge/`.
4. Leer la documentación del agente correspondiente.
5. Inspeccionar el repositorio del sitio cuando la tarea afecte contenido o código.
6. Explicar brevemente el alcance.
7. Ejecutar el cambio mínimo suficiente.
8. Validar formato, enlaces, frontmatter y build cuando corresponda.
9. Dejar un resumen verificable.

## Política editorial

El contenido debe resolver una intención real, aportar información útil y estar diseñado para una persona antes que para un motor de búsqueda. No se permite inflar artículos con repeticiones, introducciones vacías, FAQs redundantes ni afirmaciones sin fundamento.

## Política de Git

- `main` debe permanecer estable.
- Usar ramas con prefijo `codex/`, `content/`, `seo/` o `fix/`.
- Un pull request debe explicar qué cambió, por qué y cómo se verificó.
- No mezclar cambios de infraestructura con lotes grandes de contenido.

## Política de autonomía

Codex puede analizar, proponer, documentar y preparar cambios. Las acciones de publicación automática, inserción de afiliados, generación masiva y actualización de múltiples sitios requieren reglas explícitas y validación previa.
