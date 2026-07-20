# Guía global de imágenes

## Objetivo

Usar imágenes originales cuando mejoren comprensión, confianza o experiencia visual. No generar imágenes decorativas sin función editorial.

## Orden de trabajo

1. Terminar investigación, outline y borrador.
2. Identificar secciones donde una imagen aporta valor.
3. Crear un brief visual por recurso.
4. Generar con el proveedor configurado por sitio.
5. Revisar manualmente calidad, coherencia y posibles errores.
6. Optimizar dimensiones y peso.
7. Convertir al formato definido, normalmente WebP.
8. Crear nombre y texto alternativo descriptivos.
9. Insertar en el artículo y validar el build.

## Higgsfield

Higgsfield puede incorporarse como proveedor cuando exista una integración disponible y documentada. Las credenciales nunca se guardan en el repositorio. Deben utilizarse secretos del entorno o del sistema de automatización.

Antes de activar generación automática se debe definir para cada sitio:

- identidad visual;
- formatos y relaciones de aspecto;
- cantidad máxima de imágenes;
- tipos de imágenes permitidas;
- límites de costo;
- política de revisión humana;
- ruta de almacenamiento;
- convención de nombres.

## Reglas editoriales

- No representar interfaces reales de software de forma engañosa.
- No fabricar gráficos con datos inexistentes.
- No usar texto ilegible generado dentro de una imagen.
- No presentar una imagen generada como evidencia fotográfica real.
- Preferir diagramas, capturas verificadas o tablas cuando sean más útiles.
- Mantener consistencia visual dentro del sitio.

## Archivos

Convención recomendada:

```text
<slug>-hero.webp
<slug>-<section>.webp
```

El texto alternativo debe describir la imagen en contexto. No debe repetir keywords de forma artificial.

## Checklist

- ¿La imagen cumple una función?
- ¿Respeta la identidad del sitio?
- ¿No contiene errores visibles?
- ¿Está correctamente dimensionada y comprimida?
- ¿Tiene un nombre estable y descriptivo?
- ¿Tiene alt text contextual?
- ¿El artículo compila y renderiza correctamente?
