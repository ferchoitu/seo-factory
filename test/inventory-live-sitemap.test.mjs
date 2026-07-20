import assert from "node:assert/strict";
import test from "node:test";
import { locationsFromSitemap } from "../scripts/inventory-live-sitemap.mjs";

test("extrae y decodifica URLs de un sitemap", () => {
  const xml = `<?xml version="1.0"?>
    <urlset>
      <url><loc>https://example.com/</loc></url>
      <url><loc>https://example.com/search/?q=a&amp;type=b</loc></url>
    </urlset>`;

  assert.deepEqual(locationsFromSitemap(xml), [
    "https://example.com/",
    "https://example.com/search/?q=a&type=b",
  ]);
});

test("extrae sitemaps hijos de un índice", () => {
  const xml = `<sitemapindex>
    <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
    <sitemap><loc>https://example.com/sitemap-texas.xml</loc></sitemap>
  </sitemapindex>`;

  assert.equal(locationsFromSitemap(xml).length, 2);
});
