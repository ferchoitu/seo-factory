import assert from "node:assert/strict";
import test from "node:test";
import { validateHandoff } from "../scripts/handoff-contract.mjs";

function common(stage) {
  return {
    version: 1,
    id: `verifiedtitles-example-${stage}`,
    stage,
    site_id: "verifiedtitles",
    operation: "create_article",
    target_url: "/guides/example/",
  };
}

function research() {
  const primary = "https://agency.gov/source";
  const secondary = "https://example.edu/analysis";
  return {
    ...common("research"),
    primary_keyword: "example",
    intent: "informational",
    audience: ["home buyers"],
    questions_to_answer: ["What is the example?"],
    sources: [
      {
        url: primary,
        title: "Official source",
        source_type: "primary",
        accessed_at: "2026-07-20",
        claims: ["Official fact"],
      },
      {
        url: secondary,
        title: "Independent analysis",
        source_type: "secondary",
        accessed_at: "2026-07-20",
        claims: ["Context"],
      },
    ],
    verified_facts: [
      { claim: "Official fact", source_urls: [primary], freshness: "evergreen" },
    ],
    hypotheses: [],
    risks: [],
    status: "approved",
  };
}

function draft() {
  return {
    ...common("draft"),
    research_id: "verifiedtitles-example-research",
    writer_id: "writer-agent",
    title: "Example title",
    description: "Example description",
    h1: "Example H1",
    content_file: "src/content/example.js",
    headings: ["What is the example?"],
    internal_links: [
      { url: "/guides/", anchor: "guides", reason: "Parent hub" },
    ],
    claims: [
      { text: "Official fact", source_urls: ["https://agency.gov/source"] },
    ],
    unresolved_items: [],
    metrics: {
      title_length: "Example title".length,
      description_length: "Example description".length,
      h1_count: 1,
      word_count: 650,
      internal_links_count: 1,
      external_links_count: 1,
      keyword_density_percent: 1.2,
      keyword_in_title: true,
      keyword_in_h1: true,
    },
    status: "ready_for_review",
  };
}

function approvedReview(stage) {
  const checkNames =
    stage === "editorial_review"
      ? [
          "accuracy",
          "usefulness",
          "voice",
          "clarity",
          "originality",
          "claims_supported",
          "legal_notes_applied",
        ]
      : [
          "intent_match",
          "title",
          "description",
          "h1",
          "headings",
          "internal_links",
          "no_cannibalization",
          "url_preserved",
          "canonical_preserved",
          "schema_truthful",
          "indexability",
        ];
  return {
    ...common(stage),
    reviewer_id: `${stage}-agent`,
    draft_id: "verifiedtitles-example-draft",
    draft_author_id: "writer-agent",
    ...(stage === "seo_review"
      ? {
          editorial_review_id: "verifiedtitles-example-editorial-review",
          editorial_reviewer_id: "editorial_review-agent",
        }
      : {}),
    checks: Object.fromEntries(checkNames.map((name) => [name, true])),
    ...(stage === "seo_review"
      ? {
          cannibalization_report: {
            candidate_urls: [],
            resolution: "No se encontraron URLs competidoras para la keyword principal.",
          },
        }
      : {}),
    required_changes: [],
    status: "approved",
  };
}

test("aprueba research trazable con dos fuentes y una primaria", () => {
  assert.deepEqual(validateHandoff("research", research()), {
    status: "approved",
    errors: [],
  });
});

test("rechaza research aprobado que depende de una sola fuente", () => {
  const document = research();
  document.sources = document.sources.slice(0, 1);

  const result = validateHandoff("research", document);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /al menos dos fuentes/);
});

test("rechaza hechos que referencian fuentes no declaradas", () => {
  const document = research();
  document.verified_facts[0].source_urls = ["https://unknown.example/source"];

  const result = validateHandoff("research", document);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /fuente no declarada/);
});

test("aprueba un draft sin elementos pendientes", () => {
  assert.equal(validateHandoff("draft", draft()).status, "approved");
});

test("impide enviar a revisión un draft con elementos pendientes", () => {
  const document = draft();
  document.unresolved_items = ["Confirmar una cifra"];

  const result = validateHandoff("draft", document);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /unresolved_items/);
});

test("aprueba reviews editoriales y SEO completos", () => {
  assert.equal(
    validateHandoff("editorial_review", approvedReview("editorial_review")).status,
    "approved",
  );
  assert.equal(
    validateHandoff("seo_review", approvedReview("seo_review")).status,
    "approved",
  );
});

test("rechaza un review aprobado con checks fallidos", () => {
  const document = approvedReview("seo_review");
  document.checks.no_cannibalization = false;

  const result = validateHandoff("seo_review", document);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /todos los checks/);
});

test("impide que Writer, Editor o SEO se revisen a sí mismos", () => {
  const editorial = approvedReview("editorial_review");
  editorial.reviewer_id = editorial.draft_author_id;
  assert.equal(validateHandoff("editorial_review", editorial).status, "invalid");

  const seo = approvedReview("seo_review");
  seo.reviewer_id = seo.editorial_reviewer_id;
  const result = validateHandoff("seo_review", seo);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /editorial_reviewer_id/);
});

test("un handoff bloqueado válido devuelve estado blocked", () => {
  const document = research();
  document.status = "blocked";

  assert.equal(validateHandoff("research", document).status, "blocked");
});

test("rechaza freshness que no sea fecha ni evergreen", () => {
  const document = research();
  document.verified_facts[0].freshness = "current";

  const result = validateHandoff("research", document);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /freshness debe ser una fecha/);
});

test("en sitios YMYL elevados exige fuente primaria por hecho verificado", () => {
  const document = research();
  document.verified_facts[0].source_urls = ["https://example.edu/analysis"];

  const result = validateHandoff("research", document, { ymylLevel: "elevated" });
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /requiere al menos una fuente primaria/);

  assert.equal(validateHandoff("research", document, { ymylLevel: null }).status, "approved");
});

test("rechaza un draft sin metrics calculadas", () => {
  const document = draft();
  delete document.metrics;

  const result = validateHandoff("draft", document);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /metrics es obligatorio/);
});

test("rechaza metrics inconsistentes con el contenido real", () => {
  const document = draft();
  document.metrics.title_length = 999;

  const result = validateHandoff("draft", document);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /title_length no coincide/);
});

test("rechaza metrics fuera de los umbrales del sitio", () => {
  const document = draft();

  const result = validateHandoff("draft", document, {
    contentThresholds: { min_word_count: 1200 },
  });
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /word_count \(650\) está debajo del mínimo/);
});

test("rechaza un draft cuya keyword no aparece en title o H1", () => {
  const document = draft();
  document.metrics.keyword_in_title = false;

  const result = validateHandoff("draft", document);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /keyword principal debe aparecer en el title/);
});

test("exige cannibalization_report en seo_review y bloquea candidatos pendientes", () => {
  const withoutReport = approvedReview("seo_review");
  delete withoutReport.cannibalization_report;
  assert.equal(validateHandoff("seo_review", withoutReport).status, "invalid");

  const withPendingCandidates = approvedReview("seo_review");
  withPendingCandidates.cannibalization_report.candidate_urls = ["/guides/similar/"];
  const result = validateHandoff("seo_review", withPendingCandidates);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /candidate_urls pendientes/);
});
