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
