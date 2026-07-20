#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { canonicalFromHtml } from "./inventory-static-html.mjs";

export function locationsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    match[1]
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&apos;", "'"),
  );
}

function parseArguments(argv) {
  const options = { sitemap: null, extras: [], output: null, concurrency: 6 };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--sitemap") options.sitemap = argv[++index];
    else if (argument === "--extra-url") options.extras.push(argv[++index]);
    else if (argument === "--output") options.output = argv[++index];
    else if (argument === "--concurrency") options.concurrency = Number(argv[++index]);
    else throw new Error(`Argumento desconocido: ${argument}`);
  }
  if (!options.sitemap) throw new Error("Falta --sitemap <url>.");
  if (!options.output) throw new Error("Falta --output <archivo.json>.");
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 12) {
    throw new Error("--concurrency debe ser un entero entre 1 y 12.");
  }
  return options;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "SEO-Factory-URL-Inventory/0.1" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${url} respondió HTTP ${response.status}.`);
  return response.text();
}

async function sitemapUrls(indexUrl) {
  const indexXml = await fetchText(indexUrl);
  const locations = locationsFromSitemap(indexXml);
  const children = locations.filter((location) => /\.xml(?:$|\?)/i.test(location));
  if (!children.length) return locations;

  const nested = [];
  for (const child of children) {
    nested.push(...locationsFromSitemap(await fetchText(child)));
  }
  return nested;
}

function normalizedPath(url) {
  const parsed = new URL(url);
  return parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
}

async function inspectPage(url) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "SEO-Factory-URL-Inventory/0.1" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    const html = await response.text();
    return {
      url: normalizedPath(url),
      status: response.status,
      canonical: canonicalFromHtml(html),
    };
  } catch (error) {
    return { url: normalizedPath(url), status: null, canonical: null, error: error.message };
  }
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function inventoryLiveSite({ sitemap, extras = [], concurrency = 6 }) {
  const discovered = await sitemapUrls(sitemap);
  const urls = [...new Set([...discovered, ...extras])].sort();
  const pages = await mapConcurrent(urls, concurrency, inspectPage);
  pages.sort((a, b) => a.url.localeCompare(b.url));

  const anomalies = [];
  for (const page of pages) {
    if (page.status !== 200) anomalies.push({ url: page.url, type: "http_status", value: page.status });
    if (!page.canonical) anomalies.push({ url: page.url, type: "missing_canonical" });
    else {
      const canonicalPath = normalizedPath(page.canonical);
      if (canonicalPath !== page.url) {
        anomalies.push({ url: page.url, type: "canonical_mismatch", value: page.canonical });
      }
    }
  }

  return { page_count: pages.length, anomaly_count: anomalies.length, anomalies, pages };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const inventory = await inventoryLiveSite(options);
  const output = path.resolve(options.output);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`Inventario guardado en ${output}`);
  console.log(`Páginas: ${inventory.page_count}`);
  console.log(`Anomalías: ${inventory.anomaly_count}`);
  if (inventory.anomaly_count) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`No se pudo inventariar el sitio: ${error.message}`);
    process.exitCode = 1;
  });
}
