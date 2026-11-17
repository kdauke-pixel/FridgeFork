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
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("/auth/v1/user"))
      return Response.json({
        id: "test-user",
        email: "test@example.com",
        aud: "authenticated",
        created_at: "2026-01-01T00:00:00Z",
      });
    geminiCalls++;
    assert.equal(
      String(input),
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    );
    assert.equal(
      new Headers(init?.headers).get("x-goog-api-key"),
      "test-secret-gemini-never-return",
    );
    if (geminiStatus !== 200)
      return Response.json({ error: "private upstream diagnostic" }, { status: geminiStatus });
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
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
