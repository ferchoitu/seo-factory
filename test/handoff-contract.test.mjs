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
      { claim: "Official fact", source_urls: [primary], freshness: "current" },
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
