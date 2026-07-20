#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import {
  initializeRun,
  loadRun,
  packageForPublisher,
  submitHandoff,
  submitTechnicalValidation,
} from "./pipeline-runner.mjs";

function options(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) throw new Error(`Argumento desconocido: ${argument}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`Falta valor para ${argument}.`);
    parsed[argument.slice(2)] = value;
  }
  return parsed;
}

function required(parsed, names) {
  for (const name of names) {
    if (!parsed[name]) throw new Error(`Falta --${name}.`);
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const parsed = options(rest);
  if (command === "init") {
    required(parsed, ["site", "operation", "target-url"]);
    const result = await initializeRun({
      factoryRoot: parsed["factory-root"] || process.cwd(),
      siteId: parsed.site,
      operation: parsed.operation,
      targetUrl: parsed["target-url"],
    });
    console.log(`run: ${result.manifest.run_id}`);
    console.log(`directory: ${result.runDirectory}`);
    console.log(`state: ${result.manifest.state}`);
  } else if (command === "submit") {
    required(parsed, ["run", "stage", "file"]);
    const manifest = await submitHandoff({
      runDirectory: parsed.run,
      stage: parsed.stage,
      inputFile: parsed.file,
    });
    console.log(`state: ${manifest.state}`);
  } else if (command === "technical") {
    required(parsed, ["run", "file"]);
    const manifest = await submitTechnicalValidation({
      runDirectory: parsed.run,
      inputFile: parsed.file,
    });
    console.log(`state: ${manifest.state}`);
  } else if (command === "package") {
    required(parsed, ["run"]);
    const result = await packageForPublisher(parsed.run);
    console.log(`package: ${result.packagePath}`);
    console.log(`state: ${result.manifest.state}`);
  } else if (command === "status") {
    required(parsed, ["run"]);
    const manifest = await loadRun(path.resolve(parsed.run));
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    throw new Error("Uso: npm run pipeline -- <init|submit|technical|package|status> [opciones]");
  }
}

main().catch((error) => {
  console.error(`Pipeline bloqueado: ${error.message}`);
  process.exitCode = 1;
});
