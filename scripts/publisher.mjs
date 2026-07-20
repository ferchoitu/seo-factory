#!/usr/bin/env node
import process from "node:process";
import { publishRun } from "./publisher-runner.mjs";

const args = process.argv.slice(2);
const values = {};
let publish = false;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--publish") { publish = true; continue; }
  if (!args[i].startsWith("--") || !args[i + 1]) throw new Error(`Argumento inválido: ${args[i]}`);
  values[args[i].slice(2)] = args[++i];
}
for (const required of ["run", "repository", "changes"]) if (!values[required]) throw new Error(`Falta --${required}.`);
publishRun({ factoryRoot: values["factory-root"] || process.cwd(), runDirectory: values.run, repositoryPath: values.repository, changesPath: values.changes, publish })
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => { console.error(`Publisher bloqueado: ${error.message}`); process.exitCode = 1; });
