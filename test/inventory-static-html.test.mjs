import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inventoryStaticHtml } from "../scripts/inventory-static-html.mjs";

async function addPage(root, route, canonical) {
  const directory = route === "/" ? root : path.join(root, route);
  await mkdir(directory, { recursive: true });
  const canonicalTag = canonical
    ? `<link rel="canonical" href="${canonical}">`
    : "";
  await writeFile(
    path.join(directory, "index.html"),
    `<!doctype html><html><head>${canonicalTag}</head><body></body></html>`,
  );
}

test("inventa todas las rutas HTML, incluso páginas noindex", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "seo-factory-inventory-"));
  await addPage(root, "/", "https://example.com/");
  await addPage(root, "guides", "https://example.com/guides/");
  await addPage(root, "search", null);
  await mkdir(path.join(root, "assets"));
  await writeFile(path.join(root, "assets", "index.json"), "[]");

  assert.deepEqual(await inventoryStaticHtml(root), [
    { url: "/", canonical: "https://example.com/" },
    { url: "/guides/", canonical: "https://example.com/guides/" },
    { url: "/search/", canonical: null },
  ]);
});

test("ordena el resultado de forma determinista", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "seo-factory-inventory-"));
  await addPage(root, "zeta", "https://example.com/zeta/");
  await addPage(root, "alpha/nested", "https://example.com/alpha/nested/");

  const pages = await inventoryStaticHtml(root);
  assert.deepEqual(pages.map((page) => page.url), ["/alpha/nested/", "/zeta/"]);
});
