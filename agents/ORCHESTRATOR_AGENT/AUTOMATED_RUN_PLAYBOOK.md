# Playbook de ejecución automática (sin supervisión)

Este documento es el procedimiento operativo que sigue una sesión programada
(cron) para producir y publicar **una** pieza editorial para **un** sitio, de
principio a fin, sin que un humano intervenga entre etapas. Traduce los roles
descritos en `agents/*/README.md` a pasos ejecutables: comandos exactos y,
para cada etapa editorial, una invocación de sub-agente separada e
independiente.

Si en algún punto esto contradice `AGENTS.md` o un `README.md` de agente,
gana el documento más restrictivo.

## Entrada de la rutina

La rutina programada recibe un único parámetro: `site_id`. Todo lo demás
(tema, operación, contenido) lo decide el propio run, no el disparador.

## Principio de independencia

Cada etapa editorial (Research, Writer, Editorial Review, SEO Review) es una
invocación separada del `Agent` tool (`subagent_type: general-purpose`),
**no** un paso más dentro del razonamiento de la sesión orquestadora. La
sesión orquestadora:

- nunca escribe contenido ni redacta un veredicto de revisión ella misma;
- sólo decide qué comando correr después y cuándo abortar;
- le pasa a cada sub-agente **únicamente** los artefactos que le corresponden
  según `contracts/EDITORIAL_HANDOFFS.md` — nunca su propio razonamiento
  interno, ni el de una etapa anterior más allá del JSON que esa etapa
  aprobó.

El sub-agente Writer nunca ve el prompt del Research más allá del
`research.json` aprobado. El Editorial Reviewer nunca sabe qué agente escribió
el draft ni por qué. El SEO Reviewer nunca ve el razonamiento del Editorial
Reviewer, sólo su `editorial_review.json` aprobado. Cada sub-agente recibe un
`reviewer_id`/`writer_id` distinto, generado por la sesión orquestadora
(`<rol>-<run_id>`).

Esto es independencia informacional real dentro de esta plataforma, no
independencia organizacional (es el mismo proveedor de modelo). Documentarlo
así, no venderlo como más de lo que es.

## Preparación

```bash
git clone https://github.com/ferchoitu/seo-factory.git factory && cd factory
npm install
npm run preflight -- <site_id>
```

Si el `exit code` no es `0` (`ready`), la rutina termina acá. No hay
excepciones ni bypass.

```bash
git clone https://github.com/<site.repository>.git repo
```

(`site.repository` sale de `sites/<site_id>/config.yaml`.)

## Etapa 1 — Research

Spawnear un sub-agente con:

- `sites/<site_id>/config.yaml` completo;
- `sites/<site_id>/AUDIT.md` completo (incluye la sección "Selección de
  tema"/"Receta del Writer" con huecos ya identificados y temas a evitar);
- acceso de lectura al checkout de `repo/` para grep de contenido existente;
- `contracts/EDITORIAL_HANDOFFS.md`, sección Research;
- instrucción explícita: elegir **una sola** keyword dentro de
  `seo.core_topics`/`editorial_context.approved_topics`, fuera de
  `editorial_context.excluded_topics`, que no duplique ni cercar la intención
  de una URL/página/post existente. Investigar con fuentes reales (no
  inventar), priorizando `editorial_context.required_sources`. Si el sitio
  tiene `ymyl_level: elevated`, cada `verified_facts[]` necesita una fuente
  `primary`.
- Si no encuentra un hueco defendible o no consigue fuentes suficientes:
  `status: blocked`. Esto es un resultado válido y esperado, no un error del
  sub-agente.

Guardar la salida como `work/research.json` y correr:

```bash
npm run validate:handoff -- research work/research.json
```

Exit distinto de `0` → abortar el run. No reintentar con datos relajados.

## Etapa 2 — Draft (Writer)

Sólo si `research.json` fue `approved`. Spawnear un sub-agente **distinto**
con:

- únicamente `work/research.json` (aprobado);
- la sección "Receta del Writer" de `sites/<site_id>/AUDIT.md` — el patrón
  exacto de archivos a crear/editar para ese repositorio específico;
- un archivo de referencia real del repo (ejemplo existente del mismo tipo de
  página) para igualar estilo y convenciones de lint;
- `repository_contract.editable_content_paths` — el Writer no debe tocar
  nada fuera de esa lista, ni `sitemap.ts`/`llms.txt`/datos protegidos aunque
  técnicamente pudiera.

El Writer entrega los archivos de contenido reales dentro de `repo/` (sobre
el checkout limpio) **y** `work/draft.json` con `metrics` calculadas sobre
ese contenido real (no estimadas): `title_length`, `description_length`,
`h1_count`, `word_count`, `internal_links_count`, `external_links_count`,
`keyword_density_percent`, `keyword_in_title`, `keyword_in_h1`.

```bash
npm run validate:handoff -- draft work/draft.json
```

Exit distinto de `0` → abortar. `unresolved_items` no vacío → el propio
schema ya lo rechaza como `ready_for_review`.

## Etapa 3 — Editorial Review

Spawnear un sub-agente **distinto de los dos anteriores**, con `writer_id`
desconocido para él (no se le informa quién escribió el draft). Recibe:

- `work/draft.json`;
- el contenido renderizado o el archivo fuente del draft;
- `editorial_context` del sitio (voz, audiencia, `legal_or_accuracy_notes`);
- instrucción explícita de buscar problemas, no confirmar — cada check en
  `contracts/EDITORIAL_HANDOFFS.md` (`accuracy`, `usefulness`, `voice`,
  `clarity`, `originality`, `claims_supported`, `legal_notes_applied`) debe
  evaluarse mirando el contenido real, no asumirse en `true`.

```bash
npm run validate:handoff -- editorial_review work/editorial_review.json
```

`status: changes_required` o `blocked`, o exit distinto de `0` → abortar el
run completo. **No hay loop de corrección automática.** Un draft rechazado no
se reescribe en la misma corrida; el run termina y se reporta. La próxima
corrida programada empieza de cero con un research nuevo.

## Etapa 4 — SEO Review

Spawnear un cuarto sub-agente, distinto del Editorial Reviewer, con
`reviewer_id` propio. Recibe `draft.json` + `editorial_review.json`
aprobados, el inventario de URLs actual del sitio, y debe producir
`cannibalization_report` con la lista real de `candidate_urls` que evaluó
(no una lista vacía por defecto) y su `resolution`.

```bash
npm run validate:handoff -- seo_review work/seo_review.json
```

Mismo criterio de aborto que la etapa anterior.

## Etapa 5 — Validación técnica

Esto lo ejecuta la sesión orquestadora directamente (no es un rol editorial,
es verificación mecánica):

1. `git status --porcelain` en `repo/` antes de tocar nada — debe estar
   limpio; capturar `working_tree_clean_before`.
2. Capturar el inventario de URLs **antes** con el
   `repository_contract.url_inventory_command` del sitio.
3. Aplicar los archivos del Writer (ya están en el checkout desde la etapa 2).
4. Correr `repository_contract.validation_commands` y
   `repository_contract.build_command` reales. Cualquier fallo aborta.
5. Capturar el inventario de URLs **después** con el mismo comando.
6. Armar `technical_validation.json` según `contracts/TECHNICAL_VALIDATION.md`
   con los hashes reales (`sha256sum`) de cada archivo cambiado.

```bash
npm run pipeline -- init --site <site_id> --operation create_article --target-url <url>
npm run pipeline -- submit --run <run_dir> --stage research --file work/research.json
npm run pipeline -- submit --run <run_dir> --stage draft --file work/draft.json
npm run pipeline -- submit --run <run_dir> --stage editorial_review --file work/editorial_review.json
npm run pipeline -- submit --run <run_dir> --stage seo_review --file work/seo_review.json
npm run pipeline -- technical --run <run_dir> --file work/technical_validation.json
npm run pipeline -- package --run <run_dir>
```

(`init` va primero en la práctica — antes de las etapas 1-4 — para que
`run_dir` exista y cada `submit` deje su propio historial. El orden narrativo
de arriba prioriza explicar el contenido de cada etapa.)

Cualquier `submit`/`technical`/`package` con exit distinto de `0` aborta el
run sin publicar nada.

## Etapa 6 — Publish

Sólo si `package` terminó en `ready_for_publisher`:

```bash
npm run publisher -- --run <run_dir> --repository repo --changes <dir-con-archivos-aprobados> --publish
```

El Publisher recalcula hashes, vuelve a chequear `origin/main`, y sólo
entonces commitea y pushea. Ver `agents/PUBLISHER_AGENT/README.md` para el
detalle completo — este playbook no lo reimplementa.

## Etapa 7 — Reporte

Publique o aborte, la rutina termina enviando una notificación con: sitio,
resultado (`published` / `blocked` en qué etapa / `published_with_incident`),
URL si se publicó, y — específicamente para sitios donde
`sitemap.ts`/`llms.txt` (u otro archivo compartido) quedan protegidos — un
recordatorio explícito de que falta el paso manual de indexación.

Nunca dejar un run a medias en silencio. Si la rutina no puede completar el
reporte, ese fallo también debe quedar visible en el próximo disparo.

## No negociable

- Nunca `--force`, `--force-with-lease`, merge o resolución de conflictos
  automática.
- Nunca más de una publicación por sitio por corrida (lo aplica además
  `automation.cadence.max_articles_per_day` en `initializeRun`).
- Nunca tocar `repository_contract.protected_paths`.
- Nunca inventar un handoff para pasar una validación — un `blocked` es un
  resultado exitoso del sistema, no una falla a evitar.
- Nunca reintentar una etapa rechazada dentro de la misma corrida.
