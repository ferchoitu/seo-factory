import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicationRecord } from "../scripts/publication-record.mjs";

test("arma un registro auditable a partir de los artefactos de la corrida", () => {
  const { record, relativePath } = buildPublicationRecord({
    manifest: {
      site_id: "verifiedtitles",
      run_id: "verifiedtitles-20260720-abc123",
      operation: "optimize_existing_page",
      target_url: "/what-is-a-title-company/",
    },
    technical: {
      changed_files: ["src/content/articles.js"],
      protected_files_changed: false,
      build: { command: "npm run build", passed: true },
      url_comparison: { before_count: 4403, after_count: 4403, changed_canonicals: [] },
    },
    research: {
      primary_keyword: "what is a title company",
      sources: [{ url: "https://www.consumerfinance.gov/example" }],
    },
    seoReview: { cannibalization_report: { candidate_urls: [] } },
    publishResult: {
      published_sha: "b".repeat(40),
      previous_sha: "a".repeat(40),
      published_at: "2026-07-20T12:00:00.000Z",
    },
  });

  assert.equal(relativePath, "sites/verifiedtitles/runs/2026-07-20-what-is-a-title-company.yaml");
  assert.equal(record.site_id, "verifiedtitles");
  assert.equal(record.url_existed_before, true);
  assert.equal(record.primary_keyword, "what is a title company");
  assert.deepEqual(record.evidence_sources, ["https://www.consumerfinance.gov/example"]);
  assert.equal(record.validation.build_result, "passed");
  assert.equal(record.validation.url_inventory_changed, false);
  assert.equal(record.published_sha, "b".repeat(40));
});

test("no falla con artefactos ausentes o incompletos", () => {
  const { record } = buildPublicationRecord({
    manifest: { site_id: "test-site", run_id: "run-1", operation: "create_article", target_url: "/guides/new/" },
    technical: null,
    research: null,
    seoReview: null,
    publishResult: null,
  });

  assert.equal(record.primary_keyword, null);
  assert.deepEqual(record.evidence_sources, []);
  assert.equal(record.validation.build_result, "unknown");
  assert.equal(record.url_existed_before, false);
});
