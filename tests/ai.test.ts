import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/ai/route";

test("AI authenticates requests, validates input and keeps credentials out of responses", async () => {
  const originalFetch = globalThis.fetch;
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-public-anon";
  process.env.GEMINI_API_KEY = "test-secret-gemini-never-return";
  delete process.env.GEMINI_MODEL;
  let geminiCalls = 0;
  let geminiStatus = 200;
  let statuses: number[] = [];
  let sentBody = "";
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("/auth/v1/user"))
      return Response.json({
        id: "test-user",
        email: "test@example.com",
        aud: "authenticated",
        created_at: "2026-01-01T00:00:00Z",
      });
    geminiCalls++;
    sentBody = String(init?.body ?? "");
    assert.equal(
      String(input),
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    );
    assert.equal(
      new Headers(init?.headers).get("x-goog-api-key"),
      "test-secret-gemini-never-return",
    );
    const status = statuses.shift() ?? geminiStatus;
    if (status !== 200) return Response.json({ error: "private upstream diagnostic" }, { status });
    return Response.json({
      candidates: [{ content: { parts: [{ text: "Pakepink daržoves ir patiek su ryžiais." }] } }],
    });
  };
  const request = (body: unknown, authenticated = true) =>
    new NextRequest("http://localhost/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authenticated ? { Authorization: "Bearer test-access-token" } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    assert.equal(
      (await POST(request({ messages: [{ role: "user", text: "Vakarienė?" }] }, false))).status,
      401,
    );
    for (const invalid of [
      null,
      [],
      {},
      { messages: [null] },
      { messages: [{ role: "system", text: "Invalid role" }] },
      { messages: [{ role: "user", text: "a".repeat(4001) }] },
    ]) {
      assert.equal((await POST(request(invalid))).status, 400);
    }
    assert.equal(geminiCalls, 0);
    let response = await POST(
      request({
        messages: [{ role: "user", text: "Pasiūlyk vakarienę" }],
        context: "Turimi produktai: ryžiai",
      }),
    );
    let body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.text, "Pakepink daržoves ir patiek su ryžiais.");
    assert.deepEqual(
      body.operations.map((operation: { system: string }) => operation.system),
      ["Supabase", "Gemini"],
    );
    assert.ok(!JSON.stringify(body).includes("test-secret"));
    assert.ok(!JSON.stringify(body).includes("test-access-token"));
    geminiStatus = 429;
    response = await POST(request({ messages: [{ role: "user", text: "Vakarienė?" }] }));
    body = await response.json();
    assert.equal(response.status, 502);
    assert.equal(body.operations.at(-1).status, 429);
    assert.equal(body.operations.at(-1).ok, false);
    assert.ok(!JSON.stringify(body).includes("private upstream diagnostic"));
    geminiStatus = 200;
    const adaptation = {
      mode: "adapt",
      recipe: {
        name: "Blynai",
        ingredients: [{ name: "Pienas", measure: "200 ml" }],
        instructions: "Sumaišykite ir kepkite.",
      },
      request: "Neturiu pieno ir sviesto, turiu tik 30 minučių.",
      pantry: ["Avižų gėrimas"],
    };
    for (const invalid of [
      { ...adaptation, recipe: null },
      { ...adaptation, request: " " },
      { ...adaptation, recipe: { ...adaptation.recipe, instructions: "" } },
      { ...adaptation, recipe: { ...adaptation.recipe, ingredients: [] } },
      { ...adaptation, pantry: [null] },
    ])
      assert.equal((await POST(request(invalid))).status, 400);
    response = await POST(request(adaptation));
    assert.equal(response.status, 200);
    const sent = JSON.parse(sentBody);
    assert.ok(sent.systemInstruction.parts[0].text.includes(JSON.stringify(adaptation.recipe)));
    assert.ok(sent.systemInstruction.parts[0].text.includes("Avižų gėrimas"));
    assert.equal(sent.contents[0].parts[0].text, adaptation.request);
    assert.ok(sent.systemInstruction.parts[0].text.includes("Ingredientai su kiekiais"));
    statuses = [503, 200];
    response = await POST(
      request({
        ...adaptation,
        request: "Gaminsiu keturiems žmonėms ir nenoriu labai aštraus maisto.",
      }),
    );
    body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(
      body.operations
        .filter((op: { system: string }) => op.system === "Gemini")
        .map((op: { status: number }) => op.status),
      [503, 200],
    );
    statuses = [503, 503];
    const beforeRetry = geminiCalls;
    response = await POST(request(adaptation));
    body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(geminiCalls - beforeRetry, 2);
    assert.match(body.error, /po minutės/);
    assert.ok(!JSON.stringify(body).includes("private upstream"));
    const originalTimeout = AbortSignal.timeout;
    try {
      AbortSignal.timeout = () => AbortSignal.abort();
      response = await POST(request(adaptation));
      assert.equal(response.status, 504);
    } finally {
      AbortSignal.timeout = originalTimeout;
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
