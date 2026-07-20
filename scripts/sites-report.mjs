#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parse } from "yaml";
import { resolveCadenceLimits, validateSiteContract } from "./site-contract.mjs";

export async function listSiteIds(sitesRoot) {
  const entries = await readdir(sitesRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
}

async function countPublications(sitesRoot, siteId) {
  try {
    const files = await readdir(path.join(sitesRoot, siteId, "runs"));
    const yamlFiles = files.filter((file) => file.endsWith(".yaml")).sort();
    return { total: yamlFiles.length, last: yamlFiles.at(-1) ?? null };
  } catch {
    return { total: 0, last: null };
  }
}

export async function reportSite(sitesRoot, siteId) {
  const configPath = path.join(sitesRoot, siteId, "config.yaml");
  let config;
  try {
    config = parse(await readFile(configPath, "utf8"));
  } catch (error) {
    return { siteId, status: "unreadable", detail: error.message };
  }
  const contract = validateSiteContract(config);
  const cadence = resolveCadenceLimits(config);
  const publications = await countPublications(sitesRoot, siteId);
  return {
    siteId,
    status: contract.status,
    automationEnabled: config?.automation?.enabled === true,
    ymylLevel: config?.seo?.ymyl_level ?? "n/a",
    maxArticlesPerDay: cadence.max_articles_per_day,
    publications: publications.total,
    lastPublication: publications.last,
    issues: [...contract.errors, ...contract.blockers],
  };
}

function printTable(rows) {
  const columns = [
    ["Sitio", (r) => r.siteId],
    ["Contrato", (r) => r.status],
    ["Auto", (r) => (r.automationEnabled ? "on" : "off")],
    ["YMYL", (r) => r.ymylLevel],
    ["Máx/día", (r) => String(r.maxArticlesPerDay)],
    ["Publicadas", (r) => String(r.publications)],
    ["Última", (r) => r.lastPublication ?? "—"],
  ];
  const widths = columns.map(([header, get]) =>
    Math.max(header.length, ...rows.map((r) => String(get(r)).length)),
  );
  const line = (values) => values.map((value, i) => String(value).padEnd(widths[i])).join("  ");
  console.log(line(columns.map(([header]) => header)));
  console.log(line(widths.map((w) => "-".repeat(w))));
  for (const row of rows) console.log(line(columns.map(([, get]) => get(row))));

  const withIssues = rows.filter((r) => r.issues.length);
  if (withIssues.length) {
    console.log("");
    for (const row of withIssues) {
      console.log(`${row.siteId}:`);
      for (const issue of row.issues) console.log(`  - ${issue}`);
    }
  }
}

async function main() {
  const sitesRoot = path.resolve("sites");
  const siteIds = await listSiteIds(sitesRoot);
  const rows = [];
  for (const siteId of siteIds) rows.push(await reportSite(sitesRoot, siteId));

  printTable(rows);

  const blockedOrInvalid = rows.filter((r) => r.status !== "ready").length;
  process.exitCode = blockedOrInvalid > 0 ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
