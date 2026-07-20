#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parse } from "yaml";
import { validateSiteContract } from "./site-contract.mjs";

function usage() {
  console.error("Uso: npm run preflight -- <site_id>");
}

const siteId = process.argv[2];

if (!siteId || !/^[a-z0-9][a-z0-9-]*$/.test(siteId)) {
  usage();
  process.exitCode = 64;
} else {
  const configPath = path.resolve("sites", siteId, "config.yaml");

  try {
    const source = await readFile(configPath, "utf8");
    const config = parse(source);
    const result = validateSiteContract(config);

    console.log(`site_id: ${siteId}`);
    console.log(`config: ${path.relative(process.cwd(), configPath)}`);
    console.log(`status: ${result.status}`);

    for (const error of result.errors) console.log(`error: ${error}`);
    for (const blocker of result.blockers) console.log(`blocker: ${blocker}`);

    process.exitCode = result.status === "ready" ? 0 : result.status === "blocked" ? 2 : 1;
  } catch (error) {
    console.error(`No se pudo validar ${configPath}: ${error.message}`);
    process.exitCode = 1;
  }
}
