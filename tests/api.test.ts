import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/meals/route";

const previousKey = process.env.MEALDB_API_KEY;
beforeEach(() => {
  process.env.MEALDB_API_KEY = "test-server-key";
});
afterEach(() => {
  if (previousKey === undefined) delete process.env.MEALDB_API_KEY;
  else process.env.MEALDB_API_KEY = previousKey;
});

test("Recipe API reports a missing server key without fetching", async () => {
  delete process.env.MEALDB_API_KEY;
  const response = await GET(new NextRequest("http://localhost/api/meals?q=soup"));
  assert.equal(response.status, 500);
  assert.deepEqual((await response.json()).operations, []);
});

test("Recipe API rejects invalid IDs and overlarge ingredient lists before fetching", async () => {
  for (const query of [
    "id=secret-value",
    "ingredients=" + Array.from({ length: 13 }, (_, index) => `ingredient${index}`).join(","),
    "ingredients=chicken%26key%3Dsecret",
  ]) {
    const response = await GET(new NextRequest(`http://localhost/api/meals?${query}`));
    assert.equal(response.status, 400);
    assert.deepEqual((await response.json()).operations, []);
  }
});

test("Recipe API merges ingredient matches and exposes only sanitized telemetry", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    assert.ok(url.includes("/api/json/v1/test-server-key/"));
    const meals = url.includes("chicken")
      ? [
          { idMeal: "1", strMeal: "A" },
          { idMeal: "2", strMeal: "B" },
        ]
      : [{ idMeal: "2", strMeal: "B" }];
    return Response.json({ meals });
  };
  try {
    const response = await GET(
      new NextRequest("http://localhost/api/meals?ingredients=chicken,tomato,chicken"),
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(
      body.meals.map((meal: { id: string; matches: number }) => [meal.id, meal.matches]),
      [
        ["2", 2],
        ["1", 1],
      ],
    );
    assert.equal(body.operations.length, 2);
    assert.equal(body.operations[0].endpoint, "/api/json/v1/[redacted]/filter.php");
    assert.ok(!JSON.stringify(body).includes("test-server-key"));
    assert.equal(body.operations[0].method, "GET");
    assert.equal(body.operations[0].ok, true);
  } finally {
    globalThis.fetch = original;
  }
});

test("Recipe API handles no matches and upstream errors without leaking upstream response bodies", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ meals: null });
    let response = await GET(new NextRequest("http://localhost/api/meals?q=unknown"));
    assert.deepEqual((await response.json()).meals, []);
    globalThis.fetch = async () => new Response("private upstream error", { status: 503 });
    response = await GET(new NextRequest("http://localhost/api/meals?q=soup"));
    const body = await response.json();
    assert.equal(response.status, 502);
    assert.equal(body.operations[0].status, 503);
    assert.equal(body.operations[0].ok, false);
    assert.ok(!JSON.stringify(body).includes("private upstream error"));
  } finally {
    globalThis.fetch = original;
  }
});
