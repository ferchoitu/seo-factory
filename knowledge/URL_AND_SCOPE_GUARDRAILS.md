# Protección de URLs y alcance editorial

## Principio

Las URLs existentes son inmutables. SEO Factory puede mejorar lo que una página
dice, pero no dónde vive ni para qué existe.

## Snapshot obligatorio

Antes de editar un sitio se debe guardar un inventario normalizado de todas las
URLs publicadas. Después del build se genera un segundo inventario.

La validación falla cuando:

- falta una URL anterior;
- una URL anterior redirige a otra ubicación;
- cambió su canonical hacia otra URL;
- apareció una URL fuera de las raíces editoriales permitidas;
- dos URLs nuevas responden a la misma intención principal.

## Alcance por archivos

Cada sitio debe declarar:

- `editable_content_paths`: archivos donde vive el contenido editorial;
- `protected_paths`: código, datos y configuración que no puede modificarse;
- `allowed_new_content_roots`: prefijos permitidos para artículos nuevos;
- `existing_page_optimization`: campos que se pueden mejorar en páginas actuales.

Una coincidencia con `protected_paths` siempre gana sobre una ruta editable.

## Cambios aceptables en páginas existentes

- texto que responda mejor la intención actual;
- title y description sin cambiar el propósito de la página;
- jerarquía de encabezados;
- enlaces internos contextuales;
- schema que describa fielmente el contenido visible;
- correcciones de exactitud y actualización de fuentes.

## Cambios que requieren trabajo manual separado

- rutas, slugs, redirects y canonicals globales;
- navegación, componentes, estilos y templates compartidos;
- bases de datos, datasets y páginas programáticas;
- afiliados, formularios, tracking o monetización;
- cambios masivos y publicaciones en más de un sitio.

Estos cambios no se incluyen en un PR editorial automático.
