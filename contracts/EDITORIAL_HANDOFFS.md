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

Un research aprobado requiere como mínimo dos fuentes y al menos una primaria.

## Draft

Campos adicionales:

- `research_id`, `writer_id`, `title`, `description`, `h1`, `content_file`;
- `headings[]`;
- `internal_links[]`: `url`, `anchor`, `reason`;
- `claims[]`: `text`, `source_urls[]`;
- `unresolved_items[]`;
- `status`: `ready_for_review` o `blocked`.

`ready_for_review` requiere cero elementos sin resolver.

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
- `required_changes[]`;
- `status`: `approved`, `changes_required` o `blocked`.

El Publisher Agent sólo recibe el trabajo cuando ambos reviews están aprobados.
`reviewer_id` debe ser diferente del autor del draft y, para SEO, también del
revisor editorial.
