#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { parse, stringify } from "yaml";

const STATUSES = new Set(["pending", "published", "blocked"]);

/**
 * A pre-built topic queue removes the daily "find a non-duplicate topic"
 * scan from Research, but does NOT remove Research itself — the agent still
 * has to gather real, dated sources for whichever topic is next. This is
 * intentionally dumb: first pending entry wins, in file order. Reordering
 * priority is a human editing the YAML, not agent logic.
 */
export function nextPendingTopic(queue) {
  const topics = Array.isArray(queue?.topics) ? queue.topics : [];
  return topics.find((topic) => topic.status === "pending") ?? null;
}

export function updateTopicStatus(queue, slug, status, extra = {}) {
  if (!STATUSES.has(status)) throw new Error(`Estado de tema inválido: ${status}.`);
  const topics = Array.isArray(queue?.topics) ? queue.topics : [];
  let found = false;
  const updated = topics.map((topic) => {
    if (topic.slug !== slug) return topic;
    found = true;
    return { ...topic, status, ...extra };
  });
  if (!found) throw new Error(`No existe un tema con slug "${slug}" en la cola.`);
  return { ...queue, topics: updated };
}

async function loadQueue(file) {
  return parse(await readFile(file, "utf8"));
}

async function saveQueue(file, queue) {
  await writeFile(file, stringify(queue));
}

function parseArguments(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (!argument.startsWith("--")) throw new Error(`Argumento desconocido: ${argument}`);
    const value = rest[++index];
    if (value === undefined || value.startsWith("--")) throw new Error(`Falta valor para ${argument}.`);
    options[argument.slice(2)] = value;
  }
  return { command, options };
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));

  if (command === "next") {
    if (!options.file) throw new Error("Falta --file <ruta>.");
    const queue = await loadQueue(path.resolve(options.file));
    const topic = nextPendingTopic(queue);
    if (!topic) {
      console.error("No quedan temas pendientes en la cola.");
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(topic, null, 2));
  } else if (command === "update") {
    for (const required of ["file", "slug", "status"]) {
      if (!options[required]) throw new Error(`Falta --${required}.`);
    }
    const file = path.resolve(options.file);
    const queue = await loadQueue(file);
    const extra = {};
    if (options.reason) extra.reason = options.reason;
    if (options["target-url"]) extra.published_target_url = options["target-url"];
    const updated = updateTopicStatus(queue, options.slug, options.status, extra);
    await saveQueue(file, updated);
    console.log(`Tema "${options.slug}" actualizado a "${options.status}".`);
  } else {
    throw new Error("Uso: node scripts/topic-queue.mjs <next|update> --file <ruta> [opciones]");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Error en la cola de temas: ${error.message}`);
    process.exitCode = 1;
  });
}
