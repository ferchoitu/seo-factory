import assert from "node:assert/strict";
import test from "node:test";
import { nextPendingTopic, updateTopicStatus } from "../scripts/topic-queue.mjs";

function queue() {
  return {
    topics: [
      { slug: "first", working_title: "First", status: "published" },
      { slug: "second", working_title: "Second", status: "blocked", reason: "sin fuente" },
      { slug: "third", working_title: "Third", status: "pending" },
      { slug: "fourth", working_title: "Fourth", status: "pending" },
    ],
  };
}

test("nextPendingTopic devuelve el primer pendiente en orden de archivo", () => {
  assert.deepEqual(nextPendingTopic(queue()), {
    slug: "third",
    working_title: "Third",
    status: "pending",
  });
});

test("nextPendingTopic devuelve null si no quedan pendientes", () => {
  const q = queue();
  for (const topic of q.topics) topic.status = "published";
  assert.equal(nextPendingTopic(q), null);
});

test("updateTopicStatus actualiza solo el tema pedido y preserva el resto", () => {
  const updated = updateTopicStatus(queue(), "third", "published", {
    published_target_url: "/guides/third/",
  });
  const third = updated.topics.find((t) => t.slug === "third");
  assert.equal(third.status, "published");
  assert.equal(third.published_target_url, "/guides/third/");
  assert.equal(updated.topics.find((t) => t.slug === "fourth").status, "pending");
});

test("updateTopicStatus rechaza un estado inválido", () => {
  assert.throws(() => updateTopicStatus(queue(), "third", "done"), /Estado de tema inválido/);
});

test("updateTopicStatus rechaza un slug que no existe", () => {
  assert.throws(() => updateTopicStatus(queue(), "nope", "blocked"), /No existe un tema/);
});
