# Onboarding de un sitio nuevo

1. `cp -r sites/_template sites/<site_id>` y completar `config.yaml`.
2. Escribir un audit inicial en `sites/<site_id>/AUDIT.md` (ver
   `sites/verifiedtitles/AUDIT.md` como referencia): arquitectura confirmada,
   fortalezas, riesgos y primer uso recomendado.
3. Correr `npm run preflight -- <site_id>`. Mientras el resultado sea
   `blocked`, no se puede iniciar ninguna ejecución del pipeline.
4. Ejecutar el flujo manual completo al menos una vez (research → draft →
   editorial_review → seo_review → technical_validation → package →
   publish con `--publish=false` primero) antes de tocar `automation.enabled`.
5. Recién con evidencia de que el criterio editorial es confiable, activar
   `automation.enabled: true` y decidir `automation.cadence.max_articles_per_day`
   explícitamente — no heredar el valor de otro sitio.
6. Correr `npm run sites:report` para confirmar que el sitio aparece como
   `ready` junto al resto de los sitios activos.

No mezclar el onboarding de varios sitios en una misma sesión de trabajo:
cada sitio tiene su propio nicho, nivel YMYL y fuentes requeridas, y copiar
un contrato sin revisarlo es la forma más rápida de heredar un bloqueador que
nadie notó.
