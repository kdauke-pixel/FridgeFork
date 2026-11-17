import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Saved AI recipes persist and RLS blocks anonymous access and cross-user reads and writes", async () => {
  const db = new PGlite();
  const userA = "00000000-0000-0000-0000-000000000001";
  const userB = "00000000-0000-0000-0000-000000000002";
  const saved = {
    id: "saved-ai-recipe",
    meal: { name: "Pica" },
    request: "Be pieno. Laikas: 30 min. Žmonių skaičius: 2. Tikslas: pigiau.",
    result: "Pakeisk sūrį augaline alternatyva.",
    createdAt: "2026-11-17T10:00:00.000Z",
  };
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
    `);
    await db.exec(await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
    await db.query("insert into auth.users (id) values ($1), ($2)", [userA, userB]);

    await db.exec("set role anon");
    await assert.rejects(
      db.query("select adaptations from public.account_data"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("insert into public.account_data (user_id) values ($1)", [userA]),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userA]);
    await db.exec("set role authenticated");
    await db.query("insert into public.account_data (user_id, adaptations) values ($1, $2)", [
      userA,
      JSON.stringify([saved]),
    ]);
    const own = await db.query<{ adaptations: unknown[] }>(
      "select adaptations from public.account_data where user_id = $1",
      [userA],
    );
    assert.deepEqual(own.rows[0].adaptations, [saved]);

    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userB]);
    assert.equal((await db.query("select * from public.account_data")).rows.length, 0);
    assert.equal(
      (
        await db.query(
          "update public.account_data set adaptations = '[]' where user_id = $1 returning user_id",
          [userA],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query("delete from public.account_data where user_id = $1 returning user_id", [
          userA,
        ])
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query("insert into public.account_data (user_id, adaptations) values ($1, $2)", [
        userA,
        JSON.stringify([saved]),
      ]),
      /row-level security/,
    );
    await db.query("insert into public.account_data (user_id) values ($1)", [userB]);
    await assert.rejects(
      db.query("update public.account_data set user_id = $1 where user_id = $2", [userA, userB]),
      /row-level security/,
    );

    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userA]);
    await db.query("update public.account_data set adaptations = '[]' where user_id = $1", [userA]);
    const removed = await db.query<{ adaptations: unknown[] }>(
      "select adaptations from public.account_data where user_id = $1",
      [userA],
    );
    assert.deepEqual(removed.rows[0].adaptations, []);
  } finally {
    await db.close();
  }
});
