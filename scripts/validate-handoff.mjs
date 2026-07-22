#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parse } from "yaml";
import { validateHandoff } from "./handoff-contract.mjs";
import { resolveContentThresholds } from "./site-contract.mjs";

const [stage, inputFile] = process.argv.slice(2);

if (!stage || !inputFile) {
  console.error("Uso: npm run validate:handoff -- <stage> <archivo.json>");
  process.exitCode = 64;
} else {
  try {
    const document = JSON.parse(await readFile(path.resolve(inputFile), "utf8"));
    let context = {};
    try {
      const configPath = path.resolve("sites", document.site_id, "config.yaml");
      const config = parse(await readFile(configPath, "utf8"));
      context = {
        contentThresholds: resolveContentThresholds(config),
        ymylLevel: config.seo?.ymyl_level ?? null,
      };
    } catch {
      // Sin config de sitio disponible (p. ej. validación aislada): se usan
      // los umbrales por defecto y no se exige ymyl_level.
    }
    const result = validateHandoff(stage, document, context);
    console.log(`stage: ${stage}`);
    console.log(`file: ${inputFile}`);
    console.log(`status: ${result.status}`);
    for (const error of result.errors) console.log(`error: ${error}`);
    process.exitCode = result.status === "approved" ? 0 : result.status === "blocked" ? 2 : 1;
  } catch (error) {
    console.error(`No se pudo validar el handoff: ${error.message}`);
    process.exitCode = 1;
  }
}
