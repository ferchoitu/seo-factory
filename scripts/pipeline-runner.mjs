import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { validateHandoff } from "./handoff-contract.mjs";
import { validateSiteContract } from "./site-contract.mjs";

const OPERATIONS = new Set(["create_article", "optimize_existing_page"]);
const STAGE_STATE = {
  research: ["awaiting_research", "awaiting_draft"],
  draft: ["awaiting_draft", "awaiting_editorial_review"],
  editorial_review: ["awaiting_editorial_review", "awaiting_seo_review"],
  seo_review: ["awaiting_seo_review", "awaiting_technical_validation"],
};
const HANDOFF_STAGES = Object.keys(STAGE_STATE);

function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function textArray(value, { nonEmpty = false } = {}) {
  return Array.isArray(value) && (!nonEmpty || value.length > 0) && value.every(text);
}

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function now() {
  return new Date().toISOString();
}

function runIdentifier(siteId) {
  const timestamp = now().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${siteId}-${timestamp}-${randomUUID().slice(0, 8)}`;
}

function assertSiteId(siteId) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(siteId || "")) {
    throw new Error("site_id debe usar minúsculas, números y guiones.");
  }
}

function safeRepositoryPath(file) {
  return (
    text(file) &&
    !path.isAbsolute(file) &&
    !file.split(/[\\/]/).includes("..")
  );
}

function pathMatches(file, configuredPath) {
  const normalizedFile = file.replaceAll("\\", "/");
  const normalizedConfigured = configuredPath.replaceAll("\\", "/");
  return normalizedConfigured.endsWith("/")
    ? normalizedFile.startsWith(normalizedConfigured)
    : normalizedFile === normalizedConfigured;
}

function assertRunIdentity(manifest, document) {
  for (const field of ["site_id", "operation", "target_url"]) {
    if (document[field] !== manifest[field]) {
      throw new Error(`${field} no coincide con el manifest de la ejecución.`);
    }
  }
}

function assertUpstreamIdentity(manifest, stage, document) {
  const artifacts = manifest.artifacts;
  if (stage === "draft" && document.research_id !== artifacts.research?.id) {
    throw new Error("research_id no coincide con el handoff aprobado.");
  }
  if (stage === "editorial_review") {
    if (document.draft_id !== artifacts.draft?.id) {
      throw new Error("draft_id no coincide con el handoff aprobado.");
    }
    if (document.draft_author_id !== artifacts.draft?.writer_id) {
      throw new Error("draft_author_id no coincide con Writer.");
    }
  }
  if (stage === "seo_review") {
    if (document.draft_id !== artifacts.draft?.id) {
      throw new Error("draft_id no coincide con el handoff aprobado.");
    }
    if (document.editorial_review_id !== artifacts.editorial_review?.id) {
      throw new Error("editorial_review_id no coincide con el handoff aprobado.");
    }
    if (document.draft_author_id !== artifacts.draft?.writer_id) {
      throw new Error("draft_author_id no coincide con Writer.");
    }
    if (document.editorial_reviewer_id !== artifacts.editorial_review?.reviewer_id) {
      throw new Error("editorial_reviewer_id no coincide con Editor.");
    }
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeManifest(runDirectory, manifest) {
  const target = path.join(runDirectory, "manifest.json");
  const temporary = path.join(runDirectory, `.manifest-${process.pid}.tmp`);
  await writeJson(temporary, manifest);
  await rename(temporary, target);
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function withRunLock(runDirectory, callback) {
  const lockPath = path.join(runDirectory, ".lock");
  let lock;
  try {
    lock = await open(lockPath, "wx");
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error("La ejecución ya está siendo modificada por otro proceso.");
    }
    throw error;
  }
  try {
    return await callback();
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

export async function loadRun(runDirectory) {
  return readJson(path.join(path.resolve(runDirectory), "manifest.json"));
}

export async function initializeRun({ factoryRoot, siteId, operation, targetUrl }) {
  assertSiteId(siteId);
  if (!OPERATIONS.has(operation)) {
    throw new Error("operation debe ser create_article u optimize_existing_page.");
  }
  if (!text(targetUrl) || !targetUrl.startsWith("/")) {
    throw new Error("target_url debe comenzar con /.");
  }

  const root = path.resolve(factoryRoot);
  const configPath = path.join(root, "sites", siteId, "config.yaml");
  const config = parse(await readFile(configPath, "utf8"));
  const contract = validateSiteContract(config);
  if (contract.status !== "ready") {
    const details = [...contract.errors, ...contract.blockers].join(" ");
    throw new Error(`El contrato del sitio no está ready. ${details}`);
  }
  if (!config.automation.allowed_operations.includes(operation)) {
    throw new Error(`La operación ${operation} no está habilitada para ${siteId}.`);
  }

  const runId = runIdentifier(siteId);
  const runsRoot = path.join(root, "work", "runs");
  await mkdir(runsRoot, { recursive: true });
  const runDirectory = path.join(runsRoot, runId);
  await mkdir(runDirectory, { recursive: false });
  const createdAt = now();
  const manifest = {
    version: 1,
    run_id: runId,
    site_id: siteId,
    operation,
    target_url: targetUrl,
    mode: "automatic",
    state: "awaiting_research",
    created_at: createdAt,
    updated_at: createdAt,
    repository_contract: {
      editable_content_paths: config.repository_contract.editable_content_paths,
      protected_paths: config.repository_contract.protected_paths,
      allowed_new_content_roots: config.repository_contract.allowed_new_content_roots,
      build_command: config.repository_contract.build_command,
      validation_commands: config.repository_contract.validation_commands,
    },
    artifacts: {},
    history: [{ at: createdAt, event: "run_initialized", state: "awaiting_research" }],
  };
  await writeManifest(runDirectory, manifest);
  return { runDirectory, manifest };
}

export async function submitHandoff({ runDirectory, stage, inputFile }) {
  if (!HANDOFF_STAGES.includes(stage)) throw new Error(`Stage desconocido: ${stage}.`);
  const directory = path.resolve(runDirectory);
  return withRunLock(directory, async () => {
    const manifest = await loadRun(directory);
    const [expectedState, nextState] = STAGE_STATE[stage];
    if (manifest.state !== expectedState) {
      throw new Error(`La ejecución está en ${manifest.state}; esperaba ${expectedState}.`);
    }
    const document = await readJson(path.resolve(inputFile));
    const validation = validateHandoff(stage, document);
    if (validation.status !== "approved") {
      const details = validation.errors.join(" ");
      throw new Error(`Handoff ${validation.status}. ${details}`);
    }
    assertRunIdentity(manifest, document);
    assertUpstreamIdentity(manifest, stage, document);

    const artifactPath = path.join(directory, `${stage}.json`);
    await writeJson(artifactPath, document);
    const submittedAt = now();
    manifest.artifacts[stage] = {
      id: document.id,
      file: path.basename(artifactPath),
      sha256: await sha256(artifactPath),
      submitted_at: submittedAt,
      ...(stage === "draft" ? { writer_id: document.writer_id } : {}),
      ...(stage.endsWith("review") ? { reviewer_id: document.reviewer_id } : {}),
    };
    manifest.state = nextState;
    manifest.updated_at = submittedAt;
    manifest.history.push({ at: submittedAt, event: `${stage}_approved`, state: nextState });
    await writeManifest(directory, manifest);
    return manifest;
  });
}

export function validateTechnicalArtifact(document, manifest) {
  const errors = [];
  if (!object(document)) return { status: "invalid", errors: ["La raíz debe ser un objeto."] };
  if (document.version !== 1) errors.push("version debe ser 1.");
  if (document.stage !== "technical_validation") errors.push("stage debe ser technical_validation.");
  for (const field of ["run_id", "site_id", "operation", "target_url"]) {
    if (document[field] !== manifest[field]) errors.push(`${field} no coincide con el manifest.`);
  }
  for (const field of ["initial_remote_sha", "current_remote_sha"]) {
    if (!/^[a-f0-9]{40}$/i.test(document[field] || "")) errors.push(`${field} no es un SHA válido.`);
  }
  if (document.initial_remote_sha !== document.current_remote_sha) {
    errors.push("El SHA remoto cambió durante la ejecución.");
  }
  if (!textArray(document.changed_files, { nonEmpty: true })) {
    errors.push("changed_files debe contener archivos.");
  } else {
    for (const file of document.changed_files) {
      if (!safeRepositoryPath(file)) {
        errors.push(`Ruta de archivo insegura: ${file}.`);
        continue;
      }
      if (manifest.repository_contract.protected_paths.some((entry) => pathMatches(file, entry))) {
        errors.push(`El archivo protegido no puede cambiar: ${file}.`);
      } else if (
        !manifest.repository_contract.editable_content_paths.some((entry) => pathMatches(file, entry))
      ) {
        errors.push(`El archivo está fuera de rutas editables: ${file}.`);
      }
    }
  }
  if (!object(document.changed_file_sha256)) {
    errors.push("changed_file_sha256 debe ser un objeto.");
  } else if (Array.isArray(document.changed_files)) {
    const hashFiles = Object.keys(document.changed_file_sha256).sort();
    const changedFiles = [...document.changed_files].sort();
    if (JSON.stringify(hashFiles) !== JSON.stringify(changedFiles)) {
      errors.push("changed_file_sha256 debe contener exactamente changed_files.");
    }
    for (const [file, hash] of Object.entries(document.changed_file_sha256)) {
      if (!safeRepositoryPath(file) || !/^[a-f0-9]{64}$/i.test(hash || "")) {
        errors.push(`Hash de archivo inválido: ${file}.`);
      }
    }
  }
  for (const field of ["working_tree_clean_before", "diff_allowed"]) {
    if (document[field] !== true) errors.push(`${field} debe ser true.`);
  }
  if (document.protected_files_changed !== false) {
    errors.push("protected_files_changed debe ser false.");
  }
  if (!object(document.build) || !text(document.build.command) || document.build.passed !== true) {
    errors.push("build debe incluir command y passed=true.");
  } else if (document.build.command !== manifest.repository_contract.build_command) {
    errors.push("El comando de build no coincide con el contrato del sitio.");
  }
  if (
    !Array.isArray(document.validations) ||
    document.validations.some((item) => !object(item) || !text(item.command) || item.passed !== true)
  ) {
    errors.push("Todas las validations deben incluir command y passed=true.");
  } else {
    const submittedCommands = document.validations.map((item) => item.command).sort();
    const requiredCommands = [...manifest.repository_contract.validation_commands].sort();
    if (JSON.stringify(submittedCommands) !== JSON.stringify(requiredCommands)) {
      errors.push("Los comandos de validación no coinciden con el contrato del sitio.");
    }
  }
  const comparison = document.url_comparison;
  if (!object(comparison)) {
    errors.push("url_comparison debe ser un objeto.");
  } else {
    for (const field of ["before_count", "after_count"]) {
      if (!Number.isInteger(comparison[field]) || comparison[field] < 0) {
        errors.push(`url_comparison.${field} debe ser un entero no negativo.`);
      }
    }
    for (const field of ["removed_urls", "changed_canonicals", "new_urls"]) {
      if (!textArray(comparison[field])) errors.push(`url_comparison.${field} debe ser una lista.`);
    }
    if (comparison.removed_urls?.length) errors.push("No se permite eliminar URLs.");
    if (comparison.changed_canonicals?.length) errors.push("No se permite cambiar canonicals.");
    if (comparison.all_new_urls_allowed !== true) {
      errors.push("all_new_urls_allowed debe ser true.");
    }
    if (manifest.operation === "optimize_existing_page") {
      if (comparison.new_urls?.length) errors.push("Una optimización no puede crear URLs.");
      if (comparison.before_count !== comparison.after_count) {
        errors.push("Una optimización debe conservar la cantidad de URLs.");
      }
    }
    if (manifest.operation === "create_article") {
      if (!comparison.new_urls?.includes(manifest.target_url)) {
        errors.push("La URL objetivo nueva no aparece en new_urls.");
      }
      if (comparison.after_count <= comparison.before_count) {
        errors.push("create_article debe aumentar la cantidad de URLs.");
      }
    }
  }
  if (!["approved", "blocked"].includes(document.status)) {
    errors.push("status técnico no es válido.");
  }
  return {
    status: errors.length ? "invalid" : document.status === "blocked" ? "blocked" : "approved",
    errors,
  };
}

export async function submitTechnicalValidation({ runDirectory, inputFile }) {
  const directory = path.resolve(runDirectory);
  return withRunLock(directory, async () => {
    const manifest = await loadRun(directory);
    if (manifest.state !== "awaiting_technical_validation") {
      throw new Error(`La ejecución está en ${manifest.state}; esperaba awaiting_technical_validation.`);
    }
    const document = await readJson(path.resolve(inputFile));
    const validation = validateTechnicalArtifact(document, manifest);
    if (validation.status !== "approved") {
      throw new Error(`Validación técnica ${validation.status}. ${validation.errors.join(" ")}`);
    }
    const artifactPath = path.join(directory, "technical_validation.json");
    await writeJson(artifactPath, document);
    const submittedAt = now();
    manifest.artifacts.technical_validation = {
      file: path.basename(artifactPath),
      sha256: await sha256(artifactPath),
      submitted_at: submittedAt,
    };
    manifest.state = "ready_for_packaging";
    manifest.updated_at = submittedAt;
    manifest.history.push({ at: submittedAt, event: "technical_validation_approved", state: manifest.state });
    await writeManifest(directory, manifest);
    return manifest;
  });
}

export async function packageForPublisher(runDirectory) {
  const directory = path.resolve(runDirectory);
  return withRunLock(directory, async () => {
    const manifest = await loadRun(directory);
    if (manifest.state !== "ready_for_packaging") {
      throw new Error(`La ejecución está en ${manifest.state}; esperaba ready_for_packaging.`);
    }
    const artifactHashes = {};
    for (const stage of [...HANDOFF_STAGES, "technical_validation"]) {
      const artifact = manifest.artifacts[stage];
      if (!artifact?.file) throw new Error(`Falta el artefacto ${stage}.`);
      const currentHash = await sha256(path.join(directory, artifact.file));
      if (currentHash !== artifact.sha256) throw new Error(`El artefacto ${stage} fue modificado.`);
      artifactHashes[stage] = currentHash;
    }
    const packagedAt = now();
    const publicationPackage = {
      version: 1,
      status: "ready_for_publisher",
      run_id: manifest.run_id,
      site_id: manifest.site_id,
      operation: manifest.operation,
      target_url: manifest.target_url,
      artifact_sha256: artifactHashes,
      initial_remote_sha: (await readJson(path.join(directory, "technical_validation.json"))).initial_remote_sha,
      packaged_at: packagedAt,
    };
    const packagePath = path.join(directory, "publication-package.json");
    await writeJson(packagePath, publicationPackage);
    manifest.artifacts.publication_package = {
      file: path.basename(packagePath),
      sha256: await sha256(packagePath),
      submitted_at: packagedAt,
    };
    manifest.state = "ready_for_publisher";
    manifest.updated_at = packagedAt;
    manifest.history.push({ at: packagedAt, event: "publication_package_created", state: manifest.state });
    await writeManifest(directory, manifest);
    return { manifest, publicationPackage, packagePath };
  });
}
