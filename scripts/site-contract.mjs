const ALLOWED_OPERATIONS = new Set([
  "create_article",
  "optimize_existing_page",
]);

const REQUIRED_PRESERVATIONS = ["url", "slug", "primary_intent", "page_type"];
const REQUIRED_OPTIMIZATION_FIELDS = [
  "body",
  "title",
  "description",
  "headings",
  "internal_links",
  "editorial_schema",
];

export const DEFAULT_CONTENT_THRESHOLDS = {
  min_word_count: 600,
  title_min_length: 30,
  title_max_length: 60,
  description_min_length: 120,
  description_max_length: 160,
  min_internal_links: 2,
  max_internal_links: 10,
};

export const DEFAULT_CADENCE_LIMITS = {
  max_articles_per_day: 1,
};

const POSITIVE_INTEGER_FIELDS = Object.keys(DEFAULT_CONTENT_THRESHOLDS);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(nonEmptyString);
}

function stringArray(value) {
  return Array.isArray(value) && value.every(nonEmptyString);
}

function missingMembers(actual, required) {
  if (!Array.isArray(actual)) return required;
  return required.filter((item) => !actual.includes(item));
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Merges a site's declared content_thresholds over the safe defaults. Unknown
 * or invalid keys are ignored here; validateSiteContract() is what rejects an
 * invalid declaration outright so a typo never silently falls back to default.
 */
export function resolveContentThresholds(config) {
  const overrides = isObject(config?.content_thresholds) ? config.content_thresholds : {};
  const resolved = { ...DEFAULT_CONTENT_THRESHOLDS };
  for (const key of POSITIVE_INTEGER_FIELDS) {
    if (positiveInteger(overrides[key])) resolved[key] = overrides[key];
  }
  return resolved;
}

export function resolveCadenceLimits(config) {
  const overrides = isObject(config?.automation?.cadence) ? config.automation.cadence : {};
  const resolved = { ...DEFAULT_CADENCE_LIMITS };
  if (positiveInteger(overrides.max_articles_per_day)) {
    resolved.max_articles_per_day = overrides.max_articles_per_day;
  }
  return resolved;
}

export function validateSiteContract(config) {
  const errors = [];
  const blockers = [];

  if (!isObject(config)) {
    return {
      status: "invalid",
      errors: ["La raíz del YAML debe ser un objeto."],
      blockers,
    };
  }

  const site = config.site;
  const automation = config.automation;
  const publishing = config.publishing;
  const pipeline = config.editorial_pipeline;
  const repository = config.repository_contract;
  const optimization = config.existing_page_optimization;
  const editorial = config.editorial_context;

  if (!isObject(site)) {
    errors.push("Falta el objeto site.");
  } else {
    if (!nonEmptyString(site.name)) errors.push("site.name es obligatorio.");
    if (!nonEmptyString(site.repository)) errors.push("site.repository es obligatorio.");
  }

  if (!isObject(automation)) {
    errors.push("Falta el objeto automation.");
  } else {
    if (typeof automation.enabled !== "boolean") {
      errors.push("automation.enabled debe ser booleano.");
    } else if (!automation.enabled) {
      blockers.push("automation.enabled está en false.");
    }

    if (!nonEmptyStringArray(automation.allowed_operations)) {
      errors.push("automation.allowed_operations debe contener operaciones.");
    } else {
      const unknown = automation.allowed_operations.filter(
        (operation) => !ALLOWED_OPERATIONS.has(operation),
      );
      if (unknown.length) {
        errors.push(`Operaciones no permitidas: ${unknown.join(", ")}.`);
      }
    }

    if (automation.max_sites_per_run !== 1) {
      errors.push("automation.max_sites_per_run debe ser 1.");
    }
    if (automation.max_articles_per_run !== 1) {
      errors.push("automation.max_articles_per_run debe ser 1.");
    }
    if (automation.cadence !== undefined) {
      if (!isObject(automation.cadence)) {
        errors.push("automation.cadence debe ser un objeto.");
      } else if (
        automation.cadence.max_articles_per_day !== undefined &&
        !positiveInteger(automation.cadence.max_articles_per_day)
      ) {
        errors.push("automation.cadence.max_articles_per_day debe ser un entero positivo.");
      }
    }
  }

  if (!isObject(publishing)) {
    errors.push("Falta el objeto publishing.");
  } else {
    if (publishing.strategy !== "direct_main") {
      errors.push("publishing.strategy debe ser direct_main.");
    }
    if (publishing.target_branch !== "main") {
      errors.push("publishing.target_branch debe ser main.");
    }
    for (const field of [
      "auto_push",
      "require_clean_worktree",
      "require_remote_head_unchanged",
      "run_build_before_push",
      "verify_deploy_after_push",
    ]) {
      if (publishing[field] !== true) {
        errors.push(`publishing.${field} debe ser true.`);
      }
    }
  }

  if (!isObject(pipeline)) {
    errors.push("Falta el objeto editorial_pipeline.");
  } else {
    const requiredStages = ["research", "draft", "editorial_review", "seo_review"];
    const missingStages = missingMembers(pipeline.required_stages, requiredStages);
    if (missingStages.length) {
      errors.push(`editorial_pipeline.required_stages no incluye: ${missingStages.join(", ")}.`);
    }
    if (!Number.isInteger(pipeline.minimum_sources) || pipeline.minimum_sources < 2) {
      errors.push("editorial_pipeline.minimum_sources debe ser al menos 2.");
    }
    for (const field of [
      "require_primary_source",
      "block_on_unresolved_claims",
      "require_independent_reviews",
    ]) {
      if (pipeline[field] !== true) {
        errors.push(`editorial_pipeline.${field} debe ser true.`);
      }
    }
  }

  if (!isObject(repository)) {
    errors.push("Falta el objeto repository_contract.");
  } else {
    if (!nonEmptyStringArray(repository.editable_content_paths)) {
      blockers.push("repository_contract.editable_content_paths está vacío o incompleto.");
    }
    if (!stringArray(repository.protected_paths)) {
      errors.push("repository_contract.protected_paths debe ser una lista de rutas.");
    }
    if (!nonEmptyStringArray(repository.allowed_new_content_roots)) {
      blockers.push("repository_contract.allowed_new_content_roots está vacío o incompleto.");
    }
    if (
      !nonEmptyString(repository.url_inventory_command) ||
      repository.url_inventory_command.trim().toLowerCase() === "pending"
    ) {
      blockers.push("repository_contract.url_inventory_command no está configurado.");
    } else {
      const placeholders = [
        ...repository.url_inventory_command.matchAll(/\{([^}]+)\}/g),
      ].map((match) => match[1]);
      const unknownPlaceholders = placeholders.filter(
        (placeholder) => placeholder !== "repository_path",
      );
      if (unknownPlaceholders.length) {
        errors.push(
          `url_inventory_command usa placeholders no permitidos: ${unknownPlaceholders.join(", ")}.`,
        );
      }
    }
    if (!nonEmptyString(repository.build_command)) {
      blockers.push("repository_contract.build_command no está configurado.");
    }
    if (!stringArray(repository.validation_commands)) {
      errors.push("repository_contract.validation_commands debe ser una lista de comandos.");
    }
  }

  if (!isObject(optimization)) {
    errors.push("Falta el objeto existing_page_optimization.");
  } else {
    if (typeof optimization.enabled !== "boolean") {
      errors.push("existing_page_optimization.enabled debe ser booleano.");
    }
    const missingFields = missingMembers(
      optimization.allowed_fields,
      REQUIRED_OPTIMIZATION_FIELDS,
    );
    if (missingFields.length) {
      blockers.push(
        `existing_page_optimization.allowed_fields no declara: ${missingFields.join(", ")}.`,
      );
    }
    const missingPreservations = missingMembers(
      optimization.preserve,
      REQUIRED_PRESERVATIONS,
    );
    if (missingPreservations.length) {
      errors.push(
        `existing_page_optimization.preserve no incluye: ${missingPreservations.join(", ")}.`,
      );
    }
  }

  if (config.content_thresholds !== undefined) {
    if (!isObject(config.content_thresholds)) {
      errors.push("content_thresholds debe ser un objeto.");
    } else {
      for (const [key, value] of Object.entries(config.content_thresholds)) {
        if (!POSITIVE_INTEGER_FIELDS.includes(key)) {
          errors.push(`content_thresholds.${key} no es un umbral reconocido.`);
        } else if (!positiveInteger(value)) {
          errors.push(`content_thresholds.${key} debe ser un entero positivo.`);
        }
      }
      if (
        positiveInteger(config.content_thresholds.title_min_length) &&
        positiveInteger(config.content_thresholds.title_max_length) &&
        config.content_thresholds.title_min_length > config.content_thresholds.title_max_length
      ) {
        errors.push("content_thresholds.title_min_length no puede superar a title_max_length.");
      }
      if (
        positiveInteger(config.content_thresholds.description_min_length) &&
        positiveInteger(config.content_thresholds.description_max_length) &&
        config.content_thresholds.description_min_length > config.content_thresholds.description_max_length
      ) {
        errors.push(
          "content_thresholds.description_min_length no puede superar a description_max_length.",
        );
      }
      if (
        positiveInteger(config.content_thresholds.min_internal_links) &&
        positiveInteger(config.content_thresholds.max_internal_links) &&
        config.content_thresholds.min_internal_links > config.content_thresholds.max_internal_links
      ) {
        errors.push("content_thresholds.min_internal_links no puede superar a max_internal_links.");
      }
    }
  }

  if (!isObject(editorial)) {
    blockers.push("Falta el objeto editorial_context.");
  } else {
    if (!nonEmptyString(editorial.voice)) {
      blockers.push("editorial_context.voice no está definido.");
    }
    if (!nonEmptyStringArray(editorial.audience)) {
      blockers.push("editorial_context.audience está vacío.");
    }
    if (!nonEmptyStringArray(editorial.approved_topics)) {
      blockers.push("editorial_context.approved_topics está vacío.");
    }
    for (const field of ["excluded_topics", "required_sources", "legal_or_accuracy_notes"]) {
      if (!stringArray(editorial[field])) {
        errors.push(`editorial_context.${field} debe ser una lista de strings.`);
      }
    }
  }

  return {
    status: errors.length ? "invalid" : blockers.length ? "blocked" : "ready",
    errors,
    blockers,
  };
}
