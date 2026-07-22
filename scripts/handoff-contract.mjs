const OPERATIONS = new Set(["create_article", "optimize_existing_page"]);

const EDITORIAL_CHECKS = [
  "accuracy",
  "usefulness",
  "voice",
  "clarity",
  "originality",
  "claims_supported",
  "legal_notes_applied",
];

const SEO_CHECKS = [
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

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function textArray(value, { nonEmpty = false } = {}) {
  return Array.isArray(value) && (!nonEmpty || value.length > 0) && value.every(text);
}

function isFiniteNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function httpUrl(value) {
  if (!text(value)) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function requireCommon(document, stage, errors) {
  if (!object(document)) {
    errors.push("La raíz debe ser un objeto JSON.");
    return;
  }
  if (document.version !== 1) errors.push("version debe ser 1.");
  if (!text(document.id)) errors.push("id es obligatorio.");
  if (document.stage !== stage) errors.push(`stage debe ser ${stage}.`);
  if (!text(document.site_id)) errors.push("site_id es obligatorio.");
  if (!OPERATIONS.has(document.operation)) {
    errors.push("operation debe ser create_article u optimize_existing_page.");
  }
  if (!text(document.target_url) || !document.target_url.startsWith("/")) {
    errors.push("target_url debe ser una ruta absoluta del sitio.");
  }
}

function validateResearch(document, errors, context) {
  for (const field of ["primary_keyword", "intent"]) {
    if (!text(document[field])) errors.push(`${field} es obligatorio.`);
  }
  for (const field of ["audience", "questions_to_answer"]) {
    if (!textArray(document[field], { nonEmpty: true })) {
      errors.push(`${field} debe contener strings.`);
    }
  }
  for (const field of ["hypotheses", "risks"]) {
    if (!textArray(document[field])) errors.push(`${field} debe ser una lista de strings.`);
  }
  if (!Array.isArray(document.sources)) {
    errors.push("sources debe ser una lista.");
  } else {
    for (const [index, source] of document.sources.entries()) {
      if (!object(source)) {
        errors.push(`sources[${index}] debe ser un objeto.`);
        continue;
      }
      if (!httpUrl(source.url)) errors.push(`sources[${index}].url no es válida.`);
      if (!text(source.title)) errors.push(`sources[${index}].title es obligatorio.`);
      if (!["primary", "secondary"].includes(source.source_type)) {
        errors.push(`sources[${index}].source_type no es válido.`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(source.accessed_at || "")) {
        errors.push(`sources[${index}].accessed_at debe usar YYYY-MM-DD.`);
      }
      if (!textArray(source.claims, { nonEmpty: true })) {
        errors.push(`sources[${index}].claims debe contener strings.`);
      }
    }
  }
  if (!Array.isArray(document.verified_facts)) {
    errors.push("verified_facts debe ser una lista.");
  } else {
    const sourceTypeByUrl = new Map(
      (document.sources || []).map((source) => [source?.url, source?.source_type]),
    );
    for (const [index, fact] of document.verified_facts.entries()) {
      if (!object(fact) || !text(fact.claim) || !text(fact.freshness)) {
        errors.push(`verified_facts[${index}] está incompleto.`);
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}$|^evergreen$/.test(fact.freshness)) {
        errors.push(`verified_facts[${index}].freshness debe ser una fecha YYYY-MM-DD o "evergreen".`);
      }
      if (!textArray(fact.source_urls, { nonEmpty: true })) {
        errors.push(`verified_facts[${index}].source_urls debe contener URLs.`);
      } else if (fact.source_urls.some((url) => !sourceTypeByUrl.has(url))) {
        errors.push(`verified_facts[${index}] referencia una fuente no declarada.`);
      } else if (
        context?.ymylLevel === "elevated" &&
        document.status === "approved" &&
        !fact.source_urls.some((url) => sourceTypeByUrl.get(url) === "primary")
      ) {
        errors.push(
          `verified_facts[${index}] requiere al menos una fuente primaria: el sitio tiene ymyl_level elevado.`,
        );
      }
    }
  }
  if (!["approved", "blocked"].includes(document.status)) {
    errors.push("status de research no es válido.");
  }
  if (document.status === "approved") {
    if ((document.sources || []).length < 2) {
      errors.push("research aprobado requiere al menos dos fuentes.");
    }
    if (!(document.sources || []).some((source) => source?.source_type === "primary")) {
      errors.push("research aprobado requiere al menos una fuente primaria.");
    }
  }
}

const DRAFT_METRIC_NUMERIC_FIELDS = [
  "title_length",
  "description_length",
  "h1_count",
  "word_count",
  "internal_links_count",
  "external_links_count",
  "keyword_density_percent",
];

/**
 * Metrics are numbers the Writer/SEO agent must compute from the actual
 * content_file, not booleans it asserts about itself. We cross-check the
 * cheap ones (lengths, counts) against the document's own fields so a wrong
 * self-report is caught here instead of trusted downstream.
 */
function validateDraftMetrics(document, errors, thresholds) {
  const metrics = document.metrics;
  if (!object(metrics)) {
    errors.push("metrics es obligatorio: debe reportar valores calculados sobre el contenido real.");
    return;
  }
  for (const field of DRAFT_METRIC_NUMERIC_FIELDS) {
    if (!isFiniteNonNegativeNumber(metrics[field])) {
      errors.push(`metrics.${field} debe ser un número no negativo.`);
    }
  }
  for (const field of ["keyword_in_title", "keyword_in_h1"]) {
    if (typeof metrics[field] !== "boolean") errors.push(`metrics.${field} debe ser booleano.`);
  }

  if (isFiniteNonNegativeNumber(metrics.title_length) && text(document.title)) {
    if (metrics.title_length !== document.title.length) {
      errors.push("metrics.title_length no coincide con la longitud real de title.");
    }
  }
  if (isFiniteNonNegativeNumber(metrics.description_length) && text(document.description)) {
    if (metrics.description_length !== document.description.length) {
      errors.push("metrics.description_length no coincide con la longitud real de description.");
    }
  }
  if (isFiniteNonNegativeNumber(metrics.internal_links_count) && Array.isArray(document.internal_links)) {
    if (metrics.internal_links_count !== document.internal_links.length) {
      errors.push("metrics.internal_links_count no coincide con la cantidad real de internal_links.");
    }
  }
  if (isFiniteNonNegativeNumber(metrics.h1_count) && metrics.h1_count !== 1) {
    errors.push("metrics.h1_count debe ser 1: cada página debe tener exactamente un H1.");
  }
  if (metrics.keyword_in_title === false) {
    errors.push("metrics.keyword_in_title es false: la keyword principal debe aparecer en el title.");
  }
  if (metrics.keyword_in_h1 === false) {
    errors.push("metrics.keyword_in_h1 es false: la keyword principal debe aparecer en el H1.");
  }

  if (thresholds) {
    if (
      isFiniteNonNegativeNumber(metrics.word_count) &&
      metrics.word_count < thresholds.min_word_count
    ) {
      errors.push(
        `metrics.word_count (${metrics.word_count}) está debajo del mínimo del sitio (${thresholds.min_word_count}).`,
      );
    }
    if (
      isFiniteNonNegativeNumber(metrics.title_length) &&
      (metrics.title_length < thresholds.title_min_length || metrics.title_length > thresholds.title_max_length)
    ) {
      errors.push(
        `metrics.title_length (${metrics.title_length}) fuera del rango del sitio (${thresholds.title_min_length}-${thresholds.title_max_length}).`,
      );
    }
    if (
      isFiniteNonNegativeNumber(metrics.description_length) &&
      (metrics.description_length < thresholds.description_min_length ||
        metrics.description_length > thresholds.description_max_length)
    ) {
      errors.push(
        `metrics.description_length (${metrics.description_length}) fuera del rango del sitio (${thresholds.description_min_length}-${thresholds.description_max_length}).`,
      );
    }
    if (
      isFiniteNonNegativeNumber(metrics.internal_links_count) &&
      (metrics.internal_links_count < thresholds.min_internal_links ||
        metrics.internal_links_count > thresholds.max_internal_links)
    ) {
      errors.push(
        `metrics.internal_links_count (${metrics.internal_links_count}) fuera del rango del sitio (${thresholds.min_internal_links}-${thresholds.max_internal_links}).`,
      );
    }
  }
}

function validateDraft(document, errors, context) {
  for (const field of ["research_id", "writer_id", "title", "description", "h1", "content_file"]) {
    if (!text(document[field])) errors.push(`${field} es obligatorio.`);
  }
  if (!textArray(document.headings, { nonEmpty: true })) {
    errors.push("headings debe contener strings.");
  }
  if (!Array.isArray(document.internal_links)) {
    errors.push("internal_links debe ser una lista.");
  } else {
    for (const [index, link] of document.internal_links.entries()) {
      if (
        !object(link) ||
        !text(link.url) ||
        !link.url.startsWith("/") ||
        !text(link.anchor) ||
        !text(link.reason)
      ) {
        errors.push(`internal_links[${index}] está incompleto o no es interno.`);
      }
    }
  }
  if (!Array.isArray(document.claims)) {
    errors.push("claims debe ser una lista.");
  } else {
    for (const [index, claim] of document.claims.entries()) {
      if (!object(claim) || !text(claim.text) || !textArray(claim.source_urls, { nonEmpty: true })) {
        errors.push(`claims[${index}] debe incluir texto y fuentes.`);
      }
    }
  }
  if (!textArray(document.unresolved_items)) {
    errors.push("unresolved_items debe ser una lista de strings.");
  }
  validateDraftMetrics(document, errors, context?.contentThresholds);
  if (!["ready_for_review", "blocked"].includes(document.status)) {
    errors.push("status de draft no es válido.");
  }
  if (document.status === "ready_for_review" && document.unresolved_items?.length) {
    errors.push("un draft listo no puede tener unresolved_items.");
  }
}

/**
 * no_cannibalization used to be a bare boolean the reviewer asserted about
 * itself. This requires the actual list of candidate URLs it checked, so an
 * approval means "I looked and found none," not just "I clicked true."
 */
function validateCannibalizationReport(document, errors) {
  const report = document.cannibalization_report;
  if (!object(report)) {
    errors.push("cannibalization_report es obligatorio en seo_review.");
    return;
  }
  if (!textArray(report.candidate_urls)) {
    errors.push("cannibalization_report.candidate_urls debe ser una lista de strings.");
  }
  if (!text(report.resolution)) {
    errors.push("cannibalization_report.resolution es obligatorio.");
  }
  if (document.status === "approved" && report.candidate_urls?.length) {
    errors.push(
      "seo_review aprobado no puede tener candidate_urls pendientes en cannibalization_report.",
    );
  }
}

function validateReview(document, errors, stage, checkNames, upstreamFields, independentFrom) {
  for (const field of ["reviewer_id", ...upstreamFields]) {
    if (!text(document[field])) errors.push(`${field} es obligatorio.`);
  }
  if (!object(document.checks)) {
    errors.push("checks debe ser un objeto.");
  } else {
    for (const check of checkNames) {
      if (typeof document.checks[check] !== "boolean") {
        errors.push(`checks.${check} debe ser booleano.`);
      }
    }
  }
  if (!textArray(document.required_changes)) {
    errors.push("required_changes debe ser una lista de strings.");
  }
  if (!["approved", "changes_required", "blocked"].includes(document.status)) {
    errors.push(`status de ${stage} no es válido.`);
  }
  for (const field of independentFrom) {
    if (text(document.reviewer_id) && document.reviewer_id === document[field]) {
      errors.push(`reviewer_id debe ser distinto de ${field}.`);
    }
  }
  if (document.status === "approved") {
    if (checkNames.some((check) => document.checks?.[check] !== true)) {
      errors.push(`${stage} aprobado requiere todos los checks en true.`);
    }
    if (document.required_changes?.length) {
      errors.push(`${stage} aprobado no puede tener required_changes.`);
    }
  }
}

export function validateHandoff(stage, document, context = {}) {
  const errors = [];
  requireCommon(document, stage, errors);
  if (!object(document)) return { status: "invalid", errors };

  if (stage === "research") validateResearch(document, errors, context);
  else if (stage === "draft") validateDraft(document, errors, context);
  else if (stage === "editorial_review") {
    validateReview(
      document,
      errors,
      stage,
      EDITORIAL_CHECKS,
      ["draft_id", "draft_author_id"],
      ["draft_author_id"],
    );
  } else if (stage === "seo_review") {
    validateReview(
      document,
      errors,
      stage,
      SEO_CHECKS,
      ["draft_id", "editorial_review_id", "draft_author_id", "editorial_reviewer_id"],
      ["draft_author_id", "editorial_reviewer_id"],
    );
    validateCannibalizationReport(document, errors);
  } else {
    errors.push(`stage desconocido: ${stage}.`);
  }

  const blockedStatuses = new Set(["blocked", "changes_required"]);
  return {
    status: errors.length ? "invalid" : blockedStatuses.has(document.status) ? "blocked" : "approved",
    errors,
  };
}
