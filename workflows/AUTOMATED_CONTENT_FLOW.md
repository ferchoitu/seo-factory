# Flujo editorial automatizado

## Alcance

Una ejecución trabaja sobre una web, produce como máximo un commit editorial y lo
publica mediante push fast-forward a `main` después de aprobar todos los controles.

## Preflight

1. Cargar configuración y auditoría del sitio.
2. Confirmar que el contrato está completo y la automatización habilitada.
3. Actualizar el repositorio desde su rama de producción.
4. Inventariar URLs, páginas, keywords y enlaces internos.
5. Confirmar que el árbol de trabajo está limpio.
6. Guardar el SHA remoto inicial de `main`.

## Selección

El Keyword Agent propone una oportunidad con evidencia. El orquestador compara
la intención contra todas las páginas existentes y decide:

- `create_article`, si hay un hueco real dentro del blog;
- `optimize_existing_page`, si ya existe la URL adecuada;
- `blocked`, si existe canibalización, falta evidencia o la tarea sale de alcance.

## Producción

1. El Research Agent crea un brief con fuentes trazables.
2. Validar el handoff `research`; detenerse si no está aprobado.
3. El Writer Agent crea outline, mapa de enlaces y borrador en archivos editables.
4. Validar el handoff `draft`; no admitir elementos sin resolver.
5. El Editor Agent ejecuta la revisión editorial independiente.
6. Validar el handoff `editorial_review`.
7. El SEO Review Agent revisa intención, metadata, enlaces y canibalización.
8. Validar el handoff `seo_review`.
9. Comparar el diff con el contrato del sitio.
10. Validar `technical_validation.json` y generar el paquete para Publisher.

## Validación

1. Ejecutar validaciones y build declarados por el sitio.
2. Comparar el inventario de URLs anterior y posterior.
3. Confirmar que no faltan URLs ni hay cambios de canonical.
4. Confirmar que las URLs nuevas están bajo raíces permitidas.
5. Revisar que ningún archivo protegido cambió.

## Publicación

1. Confirmar nuevamente que el diff sólo contiene archivos editables.
2. Recalcular y comparar los hashes del paquete de publicación.
3. Consultar el SHA remoto actual de `main` y compararlo con el SHA inicial.
4. Bloquear si el remoto avanzó; nunca rebasar o resolver automáticamente.
5. Crear un único commit editorial verificable.
6. Hacer push fast-forward a `main`, sin force-push.
7. Esperar el deploy y comprobar la URL objetivo, metadata, canonical y enlaces.

El registro de ejecución debe incluir:

- sitio y operación;
- keyword e intención;
- URL objetivo;
- archivos modificados;
- fuentes utilizadas;
- enlaces internos agregados;
- SHA anterior y SHA publicado;
- resultado del build;
- comparación de URLs;
- resultado del despliegue y verificación posterior.

Si falla cualquier control previo, no se crea commit ni se hace push y se entrega
un informe `blocked`. Si falla la verificación posterior al push, se registra un
incidente y se detienen nuevas ejecuciones para ese sitio; no se fuerza un rollback.
