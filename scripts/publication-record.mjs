import path from "node:path";

function slugFromUrl(url) {
  return (
    (url || "")
      .toLowerCase()
      .replace(/^\/|\/$/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "run"
  );
}

function dateStamp(isoString) {
  return (isoString || new Date().toISOString()).slice(0, 10);
}

/**
 * Turns a completed run into the same kind of auditable record the pilot
 * article already used under sites/<id>/runs/*.yaml — but generated
 * automatically from the artifacts the pipeline already validated, instead
 * of written by hand after the fact. Never throws: missing or malformed
 * upstream fields degrade to null/empty rather than blocking the publish
 * that already happened.
 */
export function buildPublicationRecord({
  manifest,
  technical,
  research,
  seoReview,
  publishResult,
}) {
  const changedFiles = Array.isArray(technical?.changed_files) ? technical.changed_files : [];
  const urlComparison = technical?.url_comparison || {};
  const record = {
    site_id: manifest.site_id,
    run_id: manifest.run_id,
    operation: manifest.operation,
    target_url: manifest.target_url,
    target_file: changedFiles[0] ?? null,
    url_existed_before: manifest.operation === "optimize_existing_page",
    primary_keyword: research?.primary_keyword ?? null,
    possible_competing_urls: seoReview?.cannibalization_report?.candidate_urls ?? [],
    evidence_sources: (research?.sources ?? []).map((source) => source?.url).filter(Boolean),
    status: "published_automatically",
    validation: {
      changed_files: changedFiles,
      protected_files_changed: technical?.protected_files_changed ?? null,
      build_command: technical?.build?.command ?? null,
      build_result: technical?.build?.passed === true ? "passed" : "unknown",
      pages_before: urlComparison.before_count ?? null,
      pages_after: urlComparison.after_count ?? null,
      url_inventory_changed: urlComparison.before_count !== urlComparison.after_count,
      missing_canonicals_after: (urlComparison.changed_canonicals ?? []).length,
    },
    publication_mode: "automatic_direct_main",
    human_merge_required: false,
    published_sha: publishResult?.published_sha ?? null,
    previous_sha: publishResult?.previous_sha ?? null,
    published_at: publishResult?.published_at ?? new Date().toISOString(),
  };
  const fileName = `${dateStamp(record.published_at)}-${slugFromUrl(manifest.target_url)}.yaml`;
  return { record, relativePath: path.join("sites", manifest.site_id, "runs", fileName) };
}
