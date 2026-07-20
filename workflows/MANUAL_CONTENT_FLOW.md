# Flujo manual de contenido

## Propósito

Validar la calidad editorial y técnica antes de automatizar cualquier publicación.

## Secuencia

```text
Site config
  -> Keyword candidate
  -> Human approval
  -> Research brief
  -> Outline
  -> Draft
  -> Editorial review
  -> SEO review
  -> Image brief
  -> Repository branch
  -> Build validation
  -> Final diff approval
  -> Fast-forward push to main
  -> Vercel deployment
```

## Etapas

### 1. Elegir el sitio

Leer su configuración y revisar el repositorio real. Confirmar framework, ubicación del contenido, formato del frontmatter y comandos de validación.

### 2. Seleccionar la oportunidad

El Keyword Agent prepara candidatos. Una persona aprueba uno para evitar producción innecesaria o canibalización.

### 3. Investigar

Crear un brief con fuentes, entidades, preguntas importantes, puntos de diferenciación y datos que requieran actualización. No redactar todavía.

### 4. Crear el outline

Definir intención, promesa del artículo, H1, H2, H3, FAQs justificadas, CTA, enlaces internos y oportunidades de afiliación.

### 5. Redactar

Escribir desde el brief y el outline. No rellenar para alcanzar una cantidad arbitraria de palabras.

### 6. Revisar

Separar revisión editorial de revisión SEO. Verificar exactitud, utilidad, voz, canibalización, metadata, enlaces, schema y frontmatter.

### 7. Preparar imágenes

El Image Director decide qué imágenes aportan valor. Solo después se generan recursos, se convierten a WebP, se nombran, se crean textos alternativos y se insertan.

### 8. Publicar por Git

Preparar el contenido en una rama temporal o worktree, ejecutar todas las
validaciones y revisar el diff. Después de la aprobación manual, confirmar que el
SHA remoto de `main` no cambió, crear el commit editorial y hacer push fast-forward
a `main`. Nunca usar force-push.

### 9. Verificar deploy

Después del push, comprobar que Vercel finalizó correctamente y que la URL renderiza metadata, imágenes, enlaces y contenido sin errores.

## Criterio para automatizar

Una etapa puede automatizarse cuando:

- se ejecutó manualmente varias veces;
- sus entradas y salidas están documentadas;
- los errores frecuentes son conocidos;
- existe una validación automática o humana;
- puede revertirse sin afectar otros sitios.
