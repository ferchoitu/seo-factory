#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

/**
 * For sites where editorial content is registered in a TypeScript metadata
 * array (e.g. a Next.js blog with content living in components rather than
 * a static dist/ tree), a sitemap.xml-based inventory doesn't work if
 * sitemap.ts is a protected file: a new post never appears in the live
 * sitemap until a human updates it, so URL-comparison gates would block
 * every automated run forever. This reads slugs directly out of the
 * registry file instead, so the inventory reflects what was actually
 * published in the same commit, independent of sitemap.ts or a deploy.
 */
export function inventoryTsRegistry(source, { urlPrefix }) {
  if (!urlPrefix.startsWith("/") || !urlPrefix.endsWith("/")) {
    throw new Error("urlPrefix debe empezar y terminar con '/'.");
  }
  const slugPattern = /slug:\s*["'`]([^"'`]+)["'`]/g;
  const slugs = [...source.matchAll(slugPattern)].map((match) => match[1]);

  const seen = new Set();
  for (const slug of slugs) {
    if (seen.has(slug)) throw new Error(`slug duplicado en el registro: ${slug}.`);
    seen.add(slug);
  }

  const pages = slugs.map((slug) => {
    const url = `${urlPrefix}${slug}/`;
    return { url, canonical: url };
  });
  pages.sort((a, b) => a.url.localeCompare(b.url));
  return pages;
}

function parseArguments(argv) {
  const options = { file: null, urlPrefix: null, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--file") options.file = argv[++index];
    else if (argument === "--url-prefix") options.urlPrefix = argv[++index];
    else if (argument === "--output") options.output = argv[++index];
    else throw new Error(`Argumento desconocido: ${argument}`);
  }
  if (!options.file) throw new Error("Falta --file <archivo.ts>.");
  if (!options.urlPrefix) throw new Error("Falta --url-prefix </ruta/>.");
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const source = await readFile(path.resolve(options.file), "utf8");
  const pages = inventoryTsRegistry(source, { urlPrefix: options.urlPrefix });
  const inventory = { page_count: pages.length, pages };
  const serialized = `${JSON.stringify(inventory, null, 2)}\n`;

  if (options.output) {
    const output = path.resolve(options.output);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, serialized);
  } else {
    process.stdout.write(serialized);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`No se pudo inventariar el registro: ${error.message}`);
    process.exitCode = 1;
  });
}
