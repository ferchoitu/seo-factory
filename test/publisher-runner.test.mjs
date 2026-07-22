import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { stringify } from "yaml";
import { normalizeRemote, publishRun } from "../scripts/publisher-runner.mjs";

const exec = promisify(execFile);
async function command(cwd, commandName, args) { return (await exec(commandName, args, { cwd, encoding: "utf8" })).stdout.trim(); }
async function git(cwd, args) { return command(cwd, "git", args); }
async function sha(file) { return createHash("sha256").update(await readFile(file)).digest("hex"); }

test("normalizeRemote reconoce site.repository en formato owner/repo", () => {
  // config.yaml siempre declara site.repository como "owner/repo" (ver
  // sites/verifiedtitles/config.yaml y sites/ownthatcheck/config.yaml), nunca
  // como URL. Sin este caso, el valor caía en la rama de path.resolve() y se
  // comparaba contra un path local absoluto que nunca podía coincidir con el
  // remoto real — bloqueando toda publicación real, manual o automática.
  assert.equal(normalizeRemote("ferchoitu/titlefinder"), "ferchoitu/titlefinder");
  assert.equal(
    normalizeRemote("https://github.com/ferchoitu/titlefinder.git"),
    "ferchoitu/titlefinder",
  );
  assert.equal(
    normalizeRemote("ferchoitu/titlefinder"),
    normalizeRemote("https://github.com/ferchoitu/titlefinder.git"),
  );
});

test("normalizeRemote sigue soportando remotos locales (fixtures de test)", () => {
  const local = "/Users/dev/remote.git";
  assert.equal(normalizeRemote(local), path.resolve(local.replace(/\.git$/, "")));
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "seo-publisher-"));
  const remote = path.join(root, "remote.git");
  const repo = path.join(root, "repo");
  const changes = path.join(root, "changes");
  const run = path.join(root, "run");
  await git(root, ["init", "--bare", "--initial-branch=main", remote]);
  await git(root, ["clone", remote, repo]);
  await git(repo, ["config", "user.email", "test@example.com"]);
  await git(repo, ["config", "user.name", "Publisher Test"]);
  await mkdir(path.join(repo, "src/content"), { recursive: true });
  await writeFile(path.join(repo, "src/content/page.txt"), "before\n");
  await git(repo, ["add", "."]); await git(repo, ["commit", "-m", "initial"]); await git(repo, ["push", "origin", "main"]);
  const initial = await git(repo, ["rev-parse", "HEAD"]);
  await mkdir(path.join(changes, "src/content"), { recursive: true });
  const changed = path.join(changes, "src/content/page.txt");
  await writeFile(changed, "after\n");
  await mkdir(run); await mkdir(path.join(root, "sites/test-site"), { recursive: true });
  const config = {
    site: { name: "Test", repository: remote },
    automation: { enabled: true, allowed_operations: ["optimize_existing_page"], max_sites_per_run: 1, max_articles_per_run: 1 },
    publishing: { strategy: "direct_main", target_branch: "main", auto_push: true, require_clean_worktree: true, require_remote_head_unchanged: true, run_build_before_push: true, verify_deploy_after_push: true },
    editorial_pipeline: { required_stages: ["research", "draft", "editorial_review", "seo_review"], minimum_sources: 2, require_primary_source: true, block_on_unresolved_claims: true, require_independent_reviews: true },
    repository_contract: { editable_content_paths: ["src/content/"], protected_paths: ["data/"], allowed_new_content_roots: ["/guides/"], url_inventory_command: "true", build_command: "true", validation_commands: [] },
    existing_page_optimization: { enabled: true, allowed_fields: ["body", "title", "description", "headings", "internal_links", "editorial_schema"], preserve: ["url", "slug", "primary_intent", "page_type"] },
    editorial_context: { voice: "Clear", audience: ["Readers"], approved_topics: ["Titles"], excluded_topics: [], required_sources: [], legal_or_accuracy_notes: [] },
  };
  await writeFile(path.join(root, "sites/test-site/config.yaml"), stringify(config));
  const artifacts = {};
  const packageHashes = {};
  for (const stage of ["research", "draft", "editorial_review", "seo_review"]) {
    const file = `${stage}.json`; await writeFile(path.join(run, file), `{"stage":"${stage}"}\n`);
    const digest = await sha(path.join(run, file)); artifacts[stage] = { file, sha256: digest }; packageHashes[stage] = digest;
  }
  const technical = { changed_files: ["src/content/page.txt"], changed_file_sha256: { "src/content/page.txt": await sha(changed) } };
  await writeFile(path.join(run, "technical_validation.json"), `${JSON.stringify(technical)}\n`);
  packageHashes.technical_validation = await sha(path.join(run, "technical_validation.json"));
  artifacts.technical_validation = { file: "technical_validation.json", sha256: packageHashes.technical_validation };
  const publication = { version: 1, status: "ready_for_publisher", run_id: "run-1", site_id: "test-site", operation: "optimize_existing_page", target_url: "/guides/existing/", artifact_sha256: packageHashes, initial_remote_sha: initial };
  await writeFile(path.join(run, "publication-package.json"), `${JSON.stringify(publication)}\n`);
  artifacts.publication_package = { file: "publication-package.json", sha256: await sha(path.join(run, "publication-package.json")) };
  await writeFile(path.join(run, "manifest.json"), `${JSON.stringify({ state: "ready_for_publisher", run_id: "run-1", site_id: "test-site", operation: "optimize_existing_page", target_url: "/guides/existing/", artifacts })}\n`);
  return { root, remote, repo, changes, run, initial };
}

test("publica un único commit fast-forward directamente en main", async () => {
  const f = await fixture();
  const result = await publishRun({ factoryRoot: f.root, runDirectory: f.run, repositoryPath: f.repo, changesPath: f.changes, publish: true });
  assert.equal(result.status, "published_pending_deploy_verification");
  assert.notEqual(result.published_sha, f.initial);
  assert.equal(await git(f.remote, ["rev-parse", "main"]), result.published_sha);
  assert.equal(await readFile(path.join(f.repo, "src/content/page.txt"), "utf8"), "after\n");
});

test("dry-run valida sin modificar el checkout", async () => {
  const f = await fixture();
  const result = await publishRun({ factoryRoot: f.root, runDirectory: f.run, repositoryPath: f.repo, changesPath: f.changes });
  assert.equal(result.status, "dry_run_ready");
  assert.equal(await readFile(path.join(f.repo, "src/content/page.txt"), "utf8"), "before\n");
});

test("bloquea un árbol sucio", async () => {
  const f = await fixture(); await writeFile(path.join(f.repo, "accidental.txt"), "dirty\n");
  await assert.rejects(publishRun({ factoryRoot: f.root, runDirectory: f.run, repositoryPath: f.repo, changesPath: f.changes }), /no está limpio/);
});

test("bloquea un archivo aprobado cuyo contenido fue alterado", async () => {
  const f = await fixture(); await writeFile(path.join(f.changes, "src/content/page.txt"), "tampered\n");
  await assert.rejects(publishRun({ factoryRoot: f.root, runDirectory: f.run, repositoryPath: f.repo, changesPath: f.changes }), /Hash no aprobado/);
});

test("bloquea si origin main avanzó", async () => {
  const f = await fixture();
  const other = path.join(f.root, "other"); await git(f.root, ["clone", f.remote, other]);
  await git(other, ["config", "user.email", "other@example.com"]); await git(other, ["config", "user.name", "Other"]);
  await writeFile(path.join(other, "remote.txt"), "advanced\n"); await git(other, ["add", "."]); await git(other, ["commit", "-m", "advance"]); await git(other, ["push", "origin", "main"]);
  await assert.rejects(publishRun({ factoryRoot: f.root, runDirectory: f.run, repositoryPath: f.repo, changesPath: f.changes }), /origin\/main cambió/);
});
