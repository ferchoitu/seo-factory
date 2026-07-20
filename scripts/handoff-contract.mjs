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

function validateResearch(document, errors) {
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
    const knownSources = new Set((document.sources || []).map((source) => source?.url));
    for (const [index, fact] of document.verified_facts.entries()) {
      if (!object(fact) || !text(fact.claim) || !text(fact.freshness)) {
        errors.push(`verified_facts[${index}] está incompleto.`);
        continue;
      }
      if (!textArray(fact.source_urls, { nonEmpty: true })) {
        errors.push(`verified_facts[${index}].source_urls debe contener URLs.`);
      } else if (fact.source_urls.some((url) => !knownSources.has(url))) {
        errors.push(`verified_facts[${index}] referencia una fuente no declarada.`);
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

function validateDraft(document, errors) {
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
  if (!["ready_for_review", "blocked"].includes(document.status)) {
    errors.push("status de draft no es válido.");
  }
  if (document.status === "ready_for_review" && document.unresolved_items?.length) {
    errors.push("un draft listo no puede tener unresolved_items.");
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

export function validateHandoff(stage, document) {
  const errors = [];
  requireCommon(document, stage, errors);
  if (!object(document)) return { status: "invalid", errors };

  if (stage === "research") validateResearch(document, errors);
  else if (stage === "draft") validateDraft(document, errors);
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
  } else {
    errors.push(`stage desconocido: ${stage}.`);
  }

  const blockedStatuses = new Set(["blocked", "changes_required"]);
  return {
    status: errors.length ? "invalid" : blockedStatuses.has(document.status) ? "blocked" : "approved",
    errors,
  };
}
