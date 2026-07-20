import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { stringify } from "yaml";
import {
  initializeRun,
  loadRun,
  packageForPublisher,
  submitHandoff,
  submitTechnicalValidation,
  validateTechnicalArtifact,
} from "../scripts/pipeline-runner.mjs";

function siteConfig(enabled = true) {
  return {
    site: { name: "Test Site", repository: "owner/repository" },
    automation: {
      enabled,
      allowed_operations: ["create_article", "optimize_existing_page"],
      max_sites_per_run: 1,
      max_articles_per_run: 1,
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
      editable_content_paths: ["src/content/"],
      protected_paths: ["data/"],
      allowed_new_content_roots: ["/guides/"],
      url_inventory_command: "npm run inventory",
      build_command: "npm run build",
      validation_commands: [],
    },
    existing_page_optimization: {
      enabled: true,
      allowed_fields: [
        "body",
        "title",
        "description",
        "headings",
        "internal_links",
        "editorial_schema",
      ],
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

async function factory(enabled = true) {
  const root = await mkdtemp(path.join(os.tmpdir(), "seo-factory-pipeline-"));
  const siteDirectory = path.join(root, "sites", "test-site");
  await mkdir(siteDirectory, { recursive: true });
  await writeFile(path.join(siteDirectory, "config.yaml"), stringify(siteConfig(enabled)));
  return root;
}

async function jsonFile(root, name, value) {
  const file = path.join(root, name);
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

function common(stage) {
  return {
    version: 1,
    id: `test-run-${stage}`,
    stage,
    site_id: "test-site",
    operation: "optimize_existing_page",
    target_url: "/guides/existing/",
  };
}

function handoffs() {
  const research = {
    ...common("research"),
    primary_keyword: "existing guide",
    intent: "informational",
    audience: ["readers"],
    questions_to_answer: ["What should readers know?"],
    sources: [
      {
        url: "https://agency.gov/fact",
        title: "Official fact",
        source_type: "primary",
        accessed_at: "2026-07-20",
        claims: ["Fact"],
      },
      {
        url: "https://example.edu/context",
        title: "Context",
        source_type: "secondary",
        accessed_at: "2026-07-20",
        claims: ["Context"],
      },
    ],
    verified_facts: [
      { claim: "Fact", source_urls: ["https://agency.gov/fact"], freshness: "current" },
    ],
    hypotheses: [],
    risks: [],
    status: "approved",
  };
  const draft = {
    ...common("draft"),
    research_id: research.id,
    writer_id: "writer-agent",
    title: "Existing guide",
    description: "A useful existing guide.",
    h1: "Existing guide",
    content_file: "src/content/existing.js",
    headings: ["What readers should know"],
    internal_links: [{ url: "/guides/", anchor: "Guides", reason: "Parent hub" }],
    claims: [{ text: "Fact", source_urls: ["https://agency.gov/fact"] }],
    unresolved_items: [],
    status: "ready_for_review",
  };
  const editorial = {
    ...common("editorial_review"),
    draft_id: draft.id,
    draft_author_id: draft.writer_id,
    reviewer_id: "editor-agent",
    checks: Object.fromEntries(
      [
        "accuracy",
        "usefulness",
        "voice",
        "clarity",
        "originality",
        "claims_supported",
        "legal_notes_applied",
      ].map((key) => [key, true]),
    ),
    required_changes: [],
    status: "approved",
  };
  const seo = {
    ...common("seo_review"),
    draft_id: draft.id,
    draft_author_id: draft.writer_id,
    editorial_review_id: editorial.id,
    editorial_reviewer_id: editorial.reviewer_id,
    reviewer_id: "seo-agent",
    checks: Object.fromEntries(
      [
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
      ].map((key) => [key, true]),
    ),
    required_changes: [],
    status: "approved",
  };
  return { research, draft, editorial_review: editorial, seo_review: seo };
}

function technical(manifest) {
  return {
    version: 1,
    stage: "technical_validation",
    run_id: manifest.run_id,
    site_id: manifest.site_id,
    operation: manifest.operation,
    target_url: manifest.target_url,
    initial_remote_sha: "a".repeat(40),
    current_remote_sha: "a".repeat(40),
    changed_files: ["src/content/existing.js"],
    changed_file_sha256: { "src/content/existing.js": "b".repeat(64) },
    working_tree_clean_before: true,
    diff_allowed: true,
    protected_files_changed: false,
    build: { command: "npm run build", passed: true },
    validations: [],
    url_comparison: {
      before_count: 10,
      after_count: 10,
      removed_urls: [],
      changed_canonicals: [],
      new_urls: [],
      all_new_urls_allowed: true,
    },
    status: "approved",
  };
}

async function advanceToTechnical(root) {
  const initialized = await initializeRun({
    factoryRoot: root,
    siteId: "test-site",
    operation: "optimize_existing_page",
    targetUrl: "/guides/existing/",
  });
  for (const [stage, document] of Object.entries(handoffs())) {
    const file = await jsonFile(root, `${stage}.json`, document);
    await submitHandoff({ runDirectory: initialized.runDirectory, stage, inputFile: file });
  }
  return initialized;
}

test("no inicia una ejecución cuando automation está deshabilitada", async () => {
  const root = await factory(false);
  await assert.rejects(
    initializeRun({
      factoryRoot: root,
      siteId: "test-site",
      operation: "optimize_existing_page",
      targetUrl: "/guides/existing/",
    }),
    /no está ready/,
  );
});

test("impide saltar etapas", async () => {
  const root = await factory();
  const initialized = await initializeRun({
    factoryRoot: root,
    siteId: "test-site",
    operation: "optimize_existing_page",
    targetUrl: "/guides/existing/",
  });
  const draftFile = await jsonFile(root, "draft.json", handoffs().draft);
  await assert.rejects(
    submitHandoff({ runDirectory: initialized.runDirectory, stage: "draft", inputFile: draftFile }),
    /esperaba awaiting_draft/,
  );
});

test("impide mezclar artefactos de otra ejecución", async () => {
  const root = await factory();
  const initialized = await initializeRun({
    factoryRoot: root,
    siteId: "test-site",
    operation: "optimize_existing_page",
    targetUrl: "/guides/existing/",
  });
  const research = handoffs().research;
  research.target_url = "/guides/other/";
  const file = await jsonFile(root, "research-other.json", research);
  await assert.rejects(
    submitHandoff({ runDirectory: initialized.runDirectory, stage: "research", inputFile: file }),
    /target_url no coincide/,
  );
});

test("detecta cambios remotos y alteraciones de URLs", async () => {
  const root = await factory();
  const initialized = await advanceToTechnical(root);
  const manifest = await loadRun(initialized.runDirectory);
  const document = technical(manifest);
  document.current_remote_sha = "b".repeat(40);
  document.url_comparison.removed_urls = ["/old/"];

  const result = validateTechnicalArtifact(document, manifest);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /SHA remoto cambió/);
  assert.match(result.errors.join("\n"), /eliminar URLs/);
});

test("valida archivos y comandos contra el contrato real del sitio", async () => {
  const root = await factory();
  const initialized = await advanceToTechnical(root);
  const manifest = await loadRun(initialized.runDirectory);
  const document = technical(manifest);
  document.changed_files = ["data/protected.json"];
  document.build.command = "npm run fake-build";

  const result = validateTechnicalArtifact(document, manifest);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /archivo protegido/);
  assert.match(result.errors.join("\n"), /build no coincide/);
});

test("completa el pipeline y crea un paquete verificable para Publisher", async () => {
  const root = await factory();
  const initialized = await advanceToTechnical(root);
  const manifest = await loadRun(initialized.runDirectory);
  const technicalFile = await jsonFile(root, "technical.json", technical(manifest));
  await submitTechnicalValidation({ runDirectory: initialized.runDirectory, inputFile: technicalFile });

  const result = await packageForPublisher(initialized.runDirectory);
  assert.equal(result.manifest.state, "ready_for_publisher");
  assert.equal(result.publicationPackage.status, "ready_for_publisher");
  assert.equal(Object.keys(result.publicationPackage.artifact_sha256).length, 5);
  assert.equal(JSON.parse(await readFile(result.packagePath, "utf8")).run_id, manifest.run_id);
});

test("rechaza un artefacto modificado después de su aprobación", async () => {
  const root = await factory();
  const initialized = await advanceToTechnical(root);
  const manifest = await loadRun(initialized.runDirectory);
  const technicalFile = await jsonFile(root, "technical.json", technical(manifest));
  await submitTechnicalValidation({ runDirectory: initialized.runDirectory, inputFile: technicalFile });
  await writeFile(path.join(initialized.runDirectory, "research.json"), "{}\n");

  await assert.rejects(packageForPublisher(initialized.runDirectory), /research fue modificado/);
});
