import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { stringify } from "yaml";
import { listSiteIds, reportSite } from "../scripts/sites-report.mjs";

function readyConfig() {
  return {
    site: { name: "Ready Site", repository: "owner/ready" },
    seo: { ymyl_level: "standard" },
    automation: {
      enabled: true,
      allowed_operations: ["create_article"],
      max_sites_per_run: 1,
      max_articles_per_run: 1,
      cadence: { max_articles_per_day: 2 },
    },
    publishing: {
      strategy: "direct_main",
      target_branch: "main",
      auto_push: true,
      require_clean_worktree: true,
      require_remote_head_unchanged: true,
      run_build_before_push: true,
      verify_deploy_after_push: true,
    },
    editorial_pipeline: {
      required_stages: ["research", "draft", "editorial_review", "seo_review"],
      minimum_sources: 2,
      require_primary_source: true,
      block_on_unresolved_claims: true,
      require_independent_reviews: true,
    },
    repository_contract: {
      editable_content_paths: ["content/"],
      protected_paths: ["data/"],
      allowed_new_content_roots: ["/guides/"],
      url_inventory_command: "npm run inventory",
      build_command: "npm run build",
      validation_commands: [],
    },
    existing_page_optimization: {
      enabled: true,
      allowed_fields: ["body", "title", "description", "headings", "internal_links", "editorial_schema"],
      preserve: ["url", "slug", "primary_intent", "page_type"],
    },
    editorial_context: {
      voice: "Clear",
      audience: ["readers"],
      approved_topics: ["topic"],
      excluded_topics: [],
      required_sources: [],
      legal_or_accuracy_notes: [],
    },
  };
}

async function tempSitesRoot() {
  return mkdtemp(path.join(os.tmpdir(), "seo-factory-sites-report-"));
}

test("lista sitios reales y excluye directorios con prefijo _", async () => {
  const sitesRoot = await tempSitesRoot();
  await mkdir(path.join(sitesRoot, "ready-site"), { recursive: true });
  await mkdir(path.join(sitesRoot, "_template"), { recursive: true });

  assert.deepEqual(await listSiteIds(sitesRoot), ["ready-site"]);
});

test("reporta contrato ready, cadencia declarada y publicaciones registradas", async () => {
  const sitesRoot = await tempSitesRoot();
  const siteDir = path.join(sitesRoot, "ready-site");
  await mkdir(siteDir, { recursive: true });
  await writeFile(path.join(siteDir, "config.yaml"), stringify(readyConfig()));
  await mkdir(path.join(siteDir, "runs"), { recursive: true });
  await writeFile(path.join(siteDir, "runs", "2026-07-19-first.yaml"), "site_id: ready-site\n");
  await writeFile(path.join(siteDir, "runs", "2026-07-20-second.yaml"), "site_id: ready-site\n");

  const report = await reportSite(sitesRoot, "ready-site");
  assert.equal(report.status, "ready");
  assert.equal(report.automationEnabled, true);
  assert.equal(report.maxArticlesPerDay, 2);
  assert.equal(report.publications, 2);
  assert.equal(report.lastPublication, "2026-07-20-second.yaml");
  assert.deepEqual(report.issues, []);
});

test("reporta bloqueadores cuando el contrato está incompleto", async () => {
  const sitesRoot = await tempSitesRoot();
  const siteDir = path.join(sitesRoot, "blocked-site");
  await mkdir(siteDir, { recursive: true });
  const config = readyConfig();
  config.automation.enabled = false;
  await writeFile(path.join(siteDir, "config.yaml"), stringify(config));

  const report = await reportSite(sitesRoot, "blocked-site");
  assert.equal(report.status, "blocked");
  assert.equal(report.publications, 0);
  assert.equal(report.lastPublication, null);
  assert.ok(report.issues.some((issue) => issue.includes("automation.enabled")));
});
