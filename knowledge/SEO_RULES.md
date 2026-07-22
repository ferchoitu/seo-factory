# Reglas SEO globales

## Objetivo

Definir los estándares mínimos que deben cumplir las oportunidades, outlines, artículos y actualizaciones producidas por SEO Factory.

## Selección de temas

Una keyword solo avanza cuando:

- pertenece a una categoría aprobada del sitio;
- responde a una intención identificable;
- no duplica una URL existente;
- puede aportar una respuesta mejor o más específica;
- tiene una ruta razonable de enlazado interno;
- puede monetizarse sin perjudicar la experiencia.

## Contenido

- Responder la intención principal pronto.
- Usar títulos y subtítulos descriptivos.
- Evitar densidades artificiales de keyword.
- Incluir ejemplos, pasos, criterios o comparaciones útiles.
- No inventar experiencia, pruebas, estadísticas ni testimonios.
- Citar fuentes primarias cuando la precisión dependa de datos externos.
- Diferenciar información evergreen de datos sujetos a actualización.

## Arquitectura

- Una intención primaria por URL.
- Clusters temáticos claros.
- Enlaces internos contextuales, no forzados.
- Páginas importantes a pocos clics de la navegación principal.
- Slugs breves, descriptivos y estables.

## Control de calidad

Antes de aprobar una pieza:

- confirmar que no canibaliza otra página, con la lista real de URLs
  candidatas evaluadas (`cannibalization_report`), no sólo un check en `true`;
- validar título, descripción y encabezados contra números calculados
  (`metrics` en el handoff de draft), no contra una autoevaluación;
- revisar enlaces internos y externos;
- verificar frontmatter y schema;
- comprobar que el contenido no contiene afirmaciones inventadas y que cada
  claim cita una fuente que estuvo en el research aprobado de la misma corrida;
- ejecutar build o validación equivalente del repositorio objetivo.

Los umbrales cuantitativos (longitud de título/descripción, mínimo de
palabras, rango de enlaces internos) se declaran por sitio en
`content_thresholds` (ver `contracts/SITE_CONTRACT.md`) y el ejecutor los
aplica automáticamente al validar cada draft.

## Prohibiciones

- Contenido copiado o parafraseado de una única fuente.
- Publicación masiva sin revisión del sitio piloto.
- Páginas creadas solo para variar ciudades, marcas o keywords sin valor diferencial.
- Uso de métricas SEO inventadas.
- Promesas de resultados garantizados.
