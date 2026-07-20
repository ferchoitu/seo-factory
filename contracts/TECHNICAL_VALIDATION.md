# Contrato de validación técnica

Después de aprobar `seo_review`, el ejecutor espera `technical_validation.json`:

```json
{
  "version": 1,
  "stage": "technical_validation",
  "run_id": "verifiedtitles-20260720-example",
  "site_id": "verifiedtitles",
  "operation": "optimize_existing_page",
  "target_url": "/what-is-a-title-company/",
  "initial_remote_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "current_remote_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "changed_files": ["src/content/articles.js"],
  "changed_file_sha256": {
    "src/content/articles.js": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  },
  "working_tree_clean_before": true,
  "diff_allowed": true,
  "protected_files_changed": false,
  "build": { "command": "npm run build", "passed": true },
  "validations": [],
  "url_comparison": {
    "before_count": 4403,
    "after_count": 4403,
    "removed_urls": [],
    "changed_canonicals": [],
    "new_urls": [],
    "all_new_urls_allowed": true
  },
  "status": "approved"
}
```

El ejecutor compara `changed_files`, build y validations contra el contrato real
guardado en el manifest. No confía únicamente en las banderas del documento.
Las claves de `changed_file_sha256` deben coincidir exactamente con
`changed_files`; Publisher vuelve a calcular cada hash antes de aplicar el cambio.

Una optimización debe conservar la cantidad de URLs y no puede crear rutas. Un
artículo nuevo debe aumentar el inventario e incluir `target_url` en `new_urls`.
En ambas operaciones están prohibidas las URLs eliminadas y los canonicals
modificados.
