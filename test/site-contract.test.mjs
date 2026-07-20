import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_CADENCE_LIMITS,
  DEFAULT_CONTENT_THRESHOLDS,
  resolveCadenceLimits,
  resolveContentThresholds,
  validateSiteContract,
} from "../scripts/site-contract.mjs";

function validConfig() {
  return {
    site: { name: "Test Site", repository: "owner/repository" },
    automation: {
      enabled: true,
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
      editable_content_paths: ["content/"],
      protected_paths: ["src/"],
      allowed_new_content_roots: ["/guides/"],
      url_inventory_command: "npm run inventory:urls",
      build_command: "npm run build",
      validation_commands: ["npm test"],
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
      voice: "Clear and factual",
      audience: ["readers"],
      approved_topics: ["topic"],
      excluded_topics: [],
      required_sources: [],
      legal_or_accuracy_notes: [],
    },
  };
}

test("acepta un contrato completo y habilitado", () => {
  assert.deepEqual(validateSiteContract(validConfig()), {
    status: "ready",
    errors: [],
    blockers: [],
  });
});

test("bloquea un sitio con automatización desactivada", () => {
  const config = validConfig();
  config.automation.enabled = false;

  const result = validateSiteContract(config);
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join("\n"), /automation\.enabled/);
});

test("rechaza límites que permitirían una ejecución masiva", () => {
  const config = validConfig();
  config.automation.max_sites_per_run = 2;

  const result = validateSiteContract(config);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /max_sites_per_run/);
});

test("rechaza publicación que no apunte directamente a main", () => {
  const config = validConfig();
  config.publishing.target_branch = "develop";

  const result = validateSiteContract(config);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /target_branch/);
});

test("exige controles de concurrencia antes del push", () => {
  const config = validConfig();
  config.publishing.require_remote_head_unchanged = false;

  const result = validateSiteContract(config);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /require_remote_head_unchanged/);
});

test("exige revisiones editorial y SEO independientes", () => {
  const config = validConfig();
  config.editorial_pipeline.require_independent_reviews = false;

  const result = validateSiteContract(config);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /require_independent_reviews/);
});

test("exige research con al menos dos fuentes", () => {
  const config = validConfig();
  config.editorial_pipeline.minimum_sources = 1;

  const result = validateSiteContract(config);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /minimum_sources/);
});

test("bloquea comandos de inventario pendientes", () => {
  const config = validConfig();
  config.repository_contract.url_inventory_command = "pending";

  const result = validateSiteContract(config);
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join("\n"), /url_inventory_command/);
});

test("rechaza operaciones fuera del alcance editorial", () => {
  const config = validConfig();
  config.automation.allowed_operations.push("change_routes");

  const result = validateSiteContract(config);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /change_routes/);
});

test("rechaza placeholders de comando no autorizados", () => {
  const config = validConfig();
  config.repository_contract.url_inventory_command =
    "node inventory.js --root {user_input}";

  const result = validateSiteContract(config);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /user_input/);
});

test("resuelve umbrales de contenido por defecto cuando el sitio no los declara", () => {
  assert.deepEqual(resolveContentThresholds({}), DEFAULT_CONTENT_THRESHOLDS);
});

test("permite que un sitio sobrescriba solo algunos umbrales de contenido", () => {
  const resolved = resolveContentThresholds({ content_thresholds: { min_word_count: 900 } });
  assert.equal(resolved.min_word_count, 900);
  assert.equal(resolved.title_max_length, DEFAULT_CONTENT_THRESHOLDS.title_max_length);
});

test("rechaza content_thresholds con claves desconocidas o valores inválidos", () => {
  const config = validConfig();
  config.content_thresholds = { min_word_count: -5, unknown_field: 10 };

  const result = validateSiteContract(config);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /min_word_count debe ser un entero positivo/);
  assert.match(result.errors.join("\n"), /unknown_field no es un umbral reconocido/);
});

test("rechaza rangos de content_thresholds invertidos", () => {
  const config = validConfig();
  config.content_thresholds = { title_min_length: 80, title_max_length: 40 };

  const result = validateSiteContract(config);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /title_min_length no puede superar a title_max_length/);
});

test("por defecto la cadencia limita a un artículo por día", () => {
  assert.deepEqual(resolveCadenceLimits({}), DEFAULT_CADENCE_LIMITS);
});

test("rechaza automation.cadence.max_articles_per_day inválido", () => {
  const config = validConfig();
  config.automation.cadence = { max_articles_per_day: 0 };

  const result = validateSiteContract(config);
  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /max_articles_per_day debe ser un entero positivo/);
});
