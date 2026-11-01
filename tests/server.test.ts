import test from "node:test";
import assert from "node:assert/strict";
import { ProjectStore, createProjectServer } from "../src/server.js";
import { defaults } from "../src/index.js";
const project = { version: 1 as const, name: "Local leaf", options: defaults };
test("project store persists, expires, deletes and rejects SQL-shaped IDs", () => {
  const store = new ProjectStore(":memory:");
  try {
    const id = store.put(project, 60, 1000);
    assert.deepEqual(store.get(id, 1001), project);
    assert.equal(store.get(id, 61000), null);
    assert.equal(store.get("' OR 1=1 --"), null);
    assert.equal(store.sweep(61000), 1);
    assert.equal(store.delete(id), false);
  } finally {
    store.close();
  }
});
test("HTTP adapter enforces authentication, validates input, and persists a share", async () => {
  const store = new ProjectStore(":memory:"),
    token = "test-token-for-local-fixture-only-123456",
    server = createProjectServer({ store, token });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  try {
    const address = server.address() as { port: number },
      base = "http://127.0.0.1:" + address.port;
    assert.equal(
      (await fetch(base + "/api/projects", { method: "POST" })).status,
      401,
    );
    const response = await fetch(base + "/api/projects", {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify(project),
    });
    assert.equal(response.status, 201);
    const { path } = (await response.json()) as { path: string };
    assert.equal((await fetch(base + path)).status, 401);
    const read = await fetch(base + path, {
      headers: { authorization: "Bearer " + token },
    });
    assert.deepEqual(await read.json(), project);
    assert.equal(
      (
        await fetch(base + path, {
          method: "DELETE",
          headers: { authorization: "Bearer " + token },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(base + path, {
          headers: { authorization: "Bearer " + token },
        })
      ).status,
      404,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    store.close();
  }
});
