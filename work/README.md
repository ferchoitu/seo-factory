# Directorio de trabajo

El ejecutor crea una carpeta ignorada por Git por cada corrida:

```text
work/runs/<run_id>/
├── manifest.json
├── research.json
├── draft.json
├── editorial_review.json
├── seo_review.json
├── technical_validation.json
├── publication-package.json
└── publication-result.json  # sólo después de un push exitoso
```

`manifest.json` registra estado, timestamps, historial, contrato del repositorio y
hashes SHA-256 de cada artefacto. Un archivo `.lock` impide que dos procesos
avancen la misma ejecución simultáneamente.

Los runs contienen investigación y borradores potencialmente sensibles y no se
versionan. Los registros resumidos que deban conservarse se guardan bajo
`sites/<site_id>/runs/`.
