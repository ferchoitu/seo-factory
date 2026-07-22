import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { parse } from "yaml";
import { validateSiteContract } from "./site-contract.mjs";

const exec = promisify(execFile);
const STAGES = ["research", "draft", "editorial_review", "seo_review", "technical_validation"];

async function json(file) { return JSON.parse(await readFile(file, "utf8")); }
async function hash(file) { return createHash("sha256").update(await readFile(file)).digest("hex"); }
async function git(repo, args) {
  const { stdout } = await exec("git", args, { cwd: repo, encoding: "utf8" });
  return stdout.trim();
}
async function gitRaw(repo, args) {
  return (await exec("git", args, { cwd: repo, encoding: "utf8" })).stdout;
}
async function shell(repo, command) {
  await exec(process.env.SHELL || "/bin/sh", ["-lc", command], { cwd: repo, encoding: "utf8" });
}
function safeRelative(file) {
  return typeof file === "string" && file.length > 0 && !path.isAbsolute(file) && !file.split(/[\\/]/).includes("..");
}
function same(left, right) { return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort()); }
/**
 * site.repository in config.yaml is documented and always written as a bare
 * "owner/repo" string, never a URL — treat that form as already normalized
 * instead of falling through to the local-path branch below, which silently
 * resolved it against cwd and made this comparison never match a real site.
 */
export function normalizeRemote(value) {
  if (/^[^/\s]+\/[^/\s]+$/.test(value) && !value.includes(":")) return value;
  const github = value.match(/(?:github\.com[/:])([^/]+\/[^/.]+)(?:\.git)?$/);
  if (github) return github[1];
  return path.resolve(value.replace(/^file:\/\//, "").replace(/\.git$/, ""));
}

async function verifyPackage(runDirectory) {
  const manifest = await json(path.join(runDirectory, "manifest.json"));
  const publication = await json(path.join(runDirectory, "publication-package.json"));
  if (manifest.state !== "ready_for_publisher" || publication.status !== "ready_for_publisher") {
    throw new Error("El run no está ready_for_publisher.");
  }
  for (const field of ["run_id", "site_id", "operation", "target_url"]) {
    if (publication[field] !== manifest[field]) throw new Error(`${field} no coincide con el manifest.`);
  }
  if (await hash(path.join(runDirectory, manifest.artifacts.publication_package.file)) !== manifest.artifacts.publication_package.sha256) {
    throw new Error("publication-package.json fue modificado.");
  }
  for (const stage of STAGES) {
    const artifact = manifest.artifacts[stage];
    const current = await hash(path.join(runDirectory, artifact.file));
    if (current !== artifact.sha256 || current !== publication.artifact_sha256[stage]) {
      throw new Error(`El artefacto ${stage} fue modificado.`);
    }
  }
  return { manifest, publication, technical: await json(path.join(runDirectory, manifest.artifacts.technical_validation.file)) };
}

export async function publishRun({ factoryRoot, runDirectory, repositoryPath, changesPath, publish = false }) {
  const root = path.resolve(factoryRoot);
  const run = path.resolve(runDirectory);
  const repo = path.resolve(repositoryPath);
  const changes = path.resolve(changesPath);
  const { manifest, publication, technical } = await verifyPackage(run);
  const config = parse(await readFile(path.join(root, "sites", manifest.site_id, "config.yaml"), "utf8"));
  const contract = validateSiteContract(config);
  if (publish && contract.status !== "ready") throw new Error(`Publicación bloqueada: contrato ${contract.status}.`);
  const remoteUrl = await git(repo, ["config", "--get", "remote.origin.url"]);
  if (normalizeRemote(config.site.repository) !== normalizeRemote(remoteUrl)) {
    throw new Error("El remoto no coincide con el repositorio del sitio.");
  }
  if (await gitRaw(repo, ["status", "--porcelain"])) throw new Error("El árbol de trabajo no está limpio.");
  if (await git(repo, ["branch", "--show-current"]) !== "main") throw new Error("El checkout debe estar en main.");
  await git(repo, ["fetch", "origin", "main"]);
  const remoteBefore = await git(repo, ["rev-parse", "origin/main"]);
  const localBefore = await git(repo, ["rev-parse", "HEAD"]);
  if (remoteBefore !== publication.initial_remote_sha || localBefore !== remoteBefore) {
    throw new Error("origin/main cambió o el checkout local no coincide con el SHA aprobado.");
  }
  const approved = technical.changed_files;
  if (!same(approved, Object.keys(technical.changed_file_sha256))) throw new Error("La lista aprobada de archivos es inconsistente.");
  for (const file of approved) {
    if (!safeRelative(file)) throw new Error(`Ruta insegura: ${file}.`);
    const source = path.join(changes, file);
    if (await hash(source) !== technical.changed_file_sha256[file]) throw new Error(`Hash no aprobado: ${file}.`);
  }
  if (!publish) return { status: "dry_run_ready", remote_sha: remoteBefore, changed_files: approved };

  for (const file of approved) {
    const target = path.join(repo, file);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(changes, file), target);
  }
  const actual = (await gitRaw(repo, ["status", "--porcelain"])).split("\n").filter(Boolean).map((line) => line.slice(3));
  if (!same(actual, approved)) throw new Error(`El diff contiene archivos no aprobados: ${actual.join(", ")}.`);
  for (const command of config.repository_contract.validation_commands) await shell(repo, command);
  await shell(repo, config.repository_contract.build_command);
  const afterChecks = (await gitRaw(repo, ["status", "--porcelain"])).split("\n").filter(Boolean).map((line) => line.slice(3));
  if (!same(afterChecks, approved)) throw new Error(`Build o validaciones modificaron archivos no aprobados: ${afterChecks.join(", ")}.`);
  await git(repo, ["add", "--", ...approved]);
  const staged = (await git(repo, ["diff", "--cached", "--name-only"])).split("\n").filter(Boolean);
  if (!same(staged, approved)) throw new Error("El commit contendría archivos no aprobados.");
  await git(repo, ["commit", "-m", `seo: ${manifest.operation} ${manifest.target_url}`]);
  await git(repo, ["fetch", "origin", "main"]);
  if (await git(repo, ["rev-parse", "origin/main"]) !== remoteBefore) throw new Error("origin/main avanzó antes del push.");
  await git(repo, ["merge-base", "--is-ancestor", "origin/main", "HEAD"]);
  await git(repo, ["push", "origin", "HEAD:main"]);
  const publishedSha = await git(repo, ["rev-parse", "HEAD"]);
  const result = { status: "published_pending_deploy_verification", previous_sha: remoteBefore, published_sha: publishedSha, changed_files: approved, published_at: new Date().toISOString() };
  const temporary = path.join(run, `.publication-result-${process.pid}.tmp`);
  await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`);
  await rename(temporary, path.join(run, "publication-result.json"));
  return result;
}
