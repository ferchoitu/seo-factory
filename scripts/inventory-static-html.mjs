#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function normalizeRoute(relativeFile) {
  const normalized = relativeFile.split(path.sep).join("/");
  if (normalized === "index.html") return "/";
  return `/${normalized.slice(0, -"index.html".length)}`;
}

export function canonicalFromHtml(html) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["']/i.test(tag)) continue;
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (href) return href[1];
  }
  return null;
}

async function findIndexFiles(root, current = root) {
  const files = [];
  const entries = await readdir(current, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findIndexFiles(root, absolute)));
    } else if (entry.isFile() && entry.name === "index.html") {
      files.push(absolute);
    }
  }
  return files;
}

export async function inventoryStaticHtml(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const files = await findIndexFiles(root);
  const pages = [];

  for (const file of files) {
    const html = await readFile(file, "utf8");
    pages.push({
      url: normalizeRoute(path.relative(root, file)),
      canonical: canonicalFromHtml(html),
    });
  }

  pages.sort((a, b) => a.url.localeCompare(b.url));
  return pages;
}

function parseArguments(argv) {
  const options = { root: null, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") options.root = argv[++index];
    else if (argument === "--output") options.output = argv[++index];
    else throw new Error(`Argumento desconocido: ${argument}`);
  }
  if (!options.root) throw new Error("Falta --root <directorio-dist>.");
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const pages = await inventoryStaticHtml(options.root);
  const inventory = {
    page_count: pages.length,
    pages,
  };
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
    console.error(`No se pudo inventariar el sitio: ${error.message}`);
    process.exitCode = 1;
  });
}
