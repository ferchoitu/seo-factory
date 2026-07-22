import assert from "node:assert/strict";
import test from "node:test";
import { inventoryTsRegistry } from "../scripts/inventory-ts-registry.mjs";

function registry(slugs) {
  const entries = slugs
    .map((slug) => `  { slug: "${slug}", title: "Example", description: "Example" },`)
    .join("\n");
  return `export const BLOG_POSTS = [\n${entries}\n];\n`;
}

test("extrae slugs y construye URLs canónicas bajo el prefijo dado", () => {
  const pages = inventoryTsRegistry(registry(["what-is-fica", "how-to-read-a-pay-stub"]), {
    urlPrefix: "/blog/",
  });

  assert.deepEqual(pages, [
    { url: "/blog/how-to-read-a-pay-stub/", canonical: "/blog/how-to-read-a-pay-stub/" },
    { url: "/blog/what-is-fica/", canonical: "/blog/what-is-fica/" },
  ]);
});

test("rechaza slugs duplicados en el registro", () => {
  assert.throws(
    () => inventoryTsRegistry(registry(["duplicate", "duplicate"]), { urlPrefix: "/blog/" }),
    /slug duplicado/,
  );
});

test("exige que urlPrefix empiece y termine con /", () => {
  assert.throws(
    () => inventoryTsRegistry(registry(["example"]), { urlPrefix: "blog" }),
    /urlPrefix debe empezar y terminar/,
  );
});

test("un registro vacío produce un inventario vacío", () => {
  assert.deepEqual(inventoryTsRegistry("export const BLOG_POSTS = [];\n", { urlPrefix: "/blog/" }), []);
});
