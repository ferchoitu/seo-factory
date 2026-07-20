# Contratos de handoff editorial

Cada etapa escribe JSON. El siguiente agente sólo puede comenzar después de que
`npm run validate:handoff -- <stage> <archivo.json>` termine con exit `0`.

Todos los documentos incluyen:

```json
{
  "version": 1,
  "id": "verifiedtitles-2026-07-20-example-research",
  "stage": "research",
  "site_id": "verifiedtitles",
  "operation": "create_article",
  "target_url": "/guides/example/"
}
```

## Research

Campos adicionales:

- `primary_keyword`, `intent`, `audience[]`;
- `questions_to_answer[]`;
- `sources[]`: `url`, `title`, `source_type` (`primary` o `secondary`),
  `accessed_at` y `claims[]`;
- `verified_facts[]`: `claim`, `source_urls[]` y `freshness`;
- `hypotheses[]`, `risks[]`;
- `status`: `approved` o `blocked`.

`freshness` debe ser una fecha `YYYY-MM-DD` o el literal `"evergreen"`; no se
acepta texto libre como `"current"`.

Un research aprobado requiere como mínimo dos fuentes y al menos una primaria.
Cuando el sitio declara `seo.ymyl_level: elevated`, cada `verified_facts[]`
aprobado necesita además al menos una `source_urls` cuyo `source_type` sea
`primary` — la exigencia global de "una fuente primaria en algún lado" no
alcanza para claims de licencias, costos o requisitos legales.

## Draft

Campos adicionales:

- `research_id`, `writer_id`, `title`, `description`, `h1`, `content_file`;
- `headings[]`;
- `internal_links[]`: `url`, `anchor`, `reason`;
- `claims[]`: `text`, `source_urls[]`;
- `unresolved_items[]`;
- `metrics`: valores calculados sobre el contenido real, no autorreportados
  como booleanos — `title_length`, `description_length`, `h1_count`,
  `word_count`, `internal_links_count`, `external_links_count`,
  `keyword_density_percent`, `keyword_in_title`, `keyword_in_h1`;
- `status`: `ready_for_review` o `blocked`.

`ready_for_review` requiere cero elementos sin resolver. `metrics` se valida en
dos niveles: consistencia interna (`title_length` debe coincidir con
`title.length`, `internal_links_count` con `internal_links.length`, `h1_count`
debe ser `1`) y cumplimiento de los `content_thresholds` declarados por el
sitio (o los valores por defecto si el sitio no los declara). `keyword_in_title`
y `keyword_in_h1` deben ser `true`. Además, cada `claims[].source_urls` debe
existir dentro de `sources[]` del research aprobado de la misma corrida — el
ejecutor rechaza un draft que cite una fuente que research nunca vetó.

## Editorial review

Campos adicionales:

- `draft_id`, `draft_author_id`, `reviewer_id`;
- `checks`: `accuracy`, `usefulness`, `voice`, `clarity`, `originality`,
  `claims_supported`, `legal_notes_applied`;
- `required_changes[]`;
- `status`: `approved`, `changes_required` o `blocked`.

## SEO review

Campos adicionales:

- `draft_id`, `draft_author_id`, `editorial_review_id`,
  `editorial_reviewer_id`, `reviewer_id`;
- `checks`: `intent_match`, `title`, `description`, `h1`, `headings`,
  `internal_links`, `no_cannibalization`, `url_preserved`,
  `canonical_preserved`, `schema_truthful`, `indexability`;
- `cannibalization_report`: `candidate_urls[]` y `resolution`;
- `required_changes[]`;
- `status`: `approved`, `changes_required` o `blocked`.

`no_cannibalization: true` ya no alcanza por sí solo. `cannibalization_report`
obliga al revisor a dejar la lista real de URLs candidatas que evaluó
(`candidate_urls[]`, vacía si no encontró ninguna) y una `resolution` que
explique el criterio. Un `seo_review` aprobado no puede tener
`candidate_urls` pendientes.

El Publisher Agent sólo recibe el trabajo cuando ambos reviews están aprobados.
`reviewer_id` debe ser diferente del autor del draft y, para SEO, también del
revisor editorial.
