# Contrato obligatorio por sitio

Cada `sites/<site_id>/config.yaml` debe completar este contrato antes de habilitar
escritura automática.

```yaml
automation:
  enabled: false
  allowed_operations:
    - create_article
    - optimize_existing_page
  max_sites_per_run: 1
  max_articles_per_run: 1

publishing:
  strategy: direct_main
  target_branch: main
  auto_push: true
  require_clean_worktree: true
  require_remote_head_unchanged: true
  run_build_before_push: true
  verify_deploy_after_push: true

editorial_pipeline:
  required_stages:
    - research
    - draft
    - editorial_review
    - seo_review
  minimum_sources: 2
  require_primary_source: true
  block_on_unresolved_claims: true
  require_independent_reviews: true

repository_contract:
  editable_content_paths: []
  protected_paths: []
  allowed_new_content_roots: []
  url_inventory_command: null
  build_command: null
  validation_commands: []

existing_page_optimization:
  enabled: true
  allowed_fields:
    - body
    - title
    - description
    - headings
    - internal_links
    - editorial_schema
  preserve:
    - url
    - slug
    - primary_intent
    - page_type

editorial_context:
  voice: null
  audience: []
  approved_topics: []
  excluded_topics: []
  required_sources: []
  legal_or_accuracy_notes: []
```

## Umbrales de contenido (`content_thresholds`)

Sección opcional. Sin ella se aplican los valores por defecto de
`scripts/site-contract.mjs` (`DEFAULT_CONTENT_THRESHOLDS`): 600 palabras
mínimo, title 30-60 caracteres, description 120-160, 2 a 10 enlaces internos.
Un sitio puede sobrescribir sólo los campos que necesite; el resto conserva el
default. Estos umbrales se validan contra las `metrics` que el Writer debe
reportar en cada draft (ver `contracts/EDITORIAL_HANDOFFS.md`) — no son una
sugerencia editorial, son un gate que bloquea el handoff si no se cumplen.

```yaml
content_thresholds:
  min_word_count: 800
  title_min_length: 30
  title_max_length: 60
  description_min_length: 120
  description_max_length: 160
  min_internal_links: 2
  max_internal_links: 10
```

## Cadencia (`automation.cadence`)

Sección opcional dentro de `automation`. Sin ella, `resolveCadenceLimits()`
aplica `max_articles_per_day: 1`: un sitio nuevo nunca hereda automáticamente
la cadencia de otro. Subir el límite es una decisión explícita por sitio,
tomada después de tener evidencia de calidad estable.

```yaml
automation:
  cadence:
    max_articles_per_day: 2
```

`initializeRun` cuenta las ejecuciones ya iniciadas para ese `site_id` en el
día calendario actual (a partir de `work/runs/`) y bloquea con un error
explícito si el límite ya se alcanzó.

`automation.enabled` solo puede pasar a `true` después de completar la auditoría,
probar el flujo manual y verificar los comandos de inventario y build.

`direct_main` autoriza publicación automática únicamente para las operaciones
editoriales declaradas. Antes del commit se guarda el SHA remoto de `main`; justo
antes del push se vuelve a consultar y la ejecución se bloquea si cambió. El push
debe ser fast-forward, nunca forzado.

## Preflight ejecutable

Instalar dependencias y validar un sitio:

```bash
npm install
npm run preflight -- <site_id>
```

El comando termina con uno de estos estados:

- `ready` (`exit 0`): contrato completo y automatización habilitada;
- `invalid` (`exit 1`): estructura inválida o una regla de seguridad fue violada;
- `blocked` (`exit 2`): configuración válida pero todavía incompleta o deshabilitada;
- uso incorrecto (`exit 64`): falta el identificador del sitio o su formato no es válido.

Un resultado `blocked` es deliberado durante la fase manual. El orquestador no
puede continuar a inventario, investigación o escritura hasta obtener `ready`.

Los comandos pueden utilizar `{repository_path}` como placeholder para el checkout
local del sitio objetivo. El orquestador debe reemplazarlo por una ruta absoluta
validada antes de ejecutar el comando; nunca debe interpolar otros valores del usuario.

Para sitios estáticos cuyo output usa un `index.html` por ruta, SEO Factory incluye:

```bash
npm run inventory:static -- --root /ruta/absoluta/al/repositorio/dist
```

El inventario incluye todas las páginas HTML —también las marcadas `noindex`— y su
canonical declarado. La salida se ordena por URL para permitir comparaciones estables.

## Estado consolidado multi-sitio

Con más de un sitio activo, `npm run sites:report` recorre `sites/*/config.yaml`
(ignorando prefijos `_`, como la plantilla de onboarding), corre el mismo
`validateSiteContract` que usa preflight, y agrega la cadencia declarada y el
historial de publicaciones registrado en `sites/<site_id>/runs/*.yaml`. Termina
con `exit 1` si algún sitio no está `ready`, para poder usarlo como chequeo en
CI o antes de una tanda de corridas.

## Onboarding de un sitio nuevo

`sites/_template/` contiene un `config.yaml` comentado y un `README.md` con el
checklist de onboarding. Copiar ese directorio a `sites/<site_id>/` es el punto
de partida recomendado para no heredar sin revisión el contrato de otro sitio.
