import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const userA = "00000000-0000-0000-0000-000000000001";
const userB = "00000000-0000-0000-0000-000000000002";
const fixture = (id: string, note: string) => ({
  meal: {
    id,
    name: `Recipe ${id}`,
    image: "https://example.com/meal.jpg",
    category: "Chicken",
    ingredients: [],
    instructions: "Cook",
  },
  note,
});

async function setup() {
  const db = new PGlite();
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
  return db;
}

test("Favorites migration preserves notes, isolates users and does not resurrect removed recipes on rerun", async () => {
  const db = await setup();
  const sql = await readFile(
    new URL("../supabase/migrations/20261116_favorites.sql", import.meta.url),
    "utf8",
  );
  try {
    await db.query(
      "insert into public.account_data (user_id, favorites) values ($1, $2), ($3, $4)",
      [
        userA,
        JSON.stringify({
          "52772": fixture("52772", "Mažiau druskos"),
          "52773": fixture("52773", ""),
        }),
        userB,
        JSON.stringify({ "52772": fixture("52772", "Daugiau daržovių") }),
      ],
    );
    await db.exec(sql);
    assert.equal((await db.query("select * from public.favorites")).rows.length, 3);
    const migrated = await db.query<{ note: string; recipe_name: string }>(
      "select note, recipe_name from public.favorites where user_id=$1 and recipe_id='52772'",
      [userA],
    );
    assert.equal(migrated.rows[0].note, "Mažiau druskos");
    assert.equal(migrated.rows[0].recipe_name, "Recipe 52772");

    await db.exec("set role anon");
    await assert.rejects(db.query("select * from public.favorites"), /permission denied/);
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userA]);
    await db.exec("set role authenticated");
    assert.equal((await db.query("select * from public.favorites")).rows.length, 2);
    assert.equal(
      (
        await db.query(
          "update public.favorites set note='Forbidden' where user_id=$1 returning id",
          [userB],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (await db.query("delete from public.favorites where user_id=$1 returning id", [userB])).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query("update public.favorites set user_id=$1 where recipe_id='52773'", [userB]),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into public.favorites (user_id,recipe_id,recipe_name,image_url,recipe_data) values ($1,'999','Other user','image','{}')",
        [userB],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into public.favorites (user_id,recipe_id,recipe_name,image_url,recipe_data) values ($1,'52772','Duplicate','image','{}')",
        [userA],
      ),
      /unique constraint/,
    );
    await db.query("update public.favorites set note='' where recipe_id='52772'");
    assert.equal(
      (
        await db.query<{ note: string }>(
          "select note from public.favorites where recipe_id='52772'",
        )
      ).rows[0].note,
      "",
    );
    await db.query("delete from public.favorites where recipe_id='52773'");
    await db.exec("reset role");
    await db.exec(sql);
    assert.equal((await db.query("select * from public.favorites")).rows.length, 2);
    assert.equal(
      (
        await db.query<{ note: string }>("select note from public.favorites where user_id=$1", [
          userA,
        ])
      ).rows[0].note,
      "",
    );
    assert.equal(
      (
        await db.query<{ note: string }>("select note from public.favorites where user_id=$1", [
          userB,
        ])
      ).rows[0].note,
      "Daugiau daržovių",
    );
    const legacy = await db.query<{ favorites: Record<string, { note: string }> }>(
      "select favorites from public.account_data where user_id=$1",
      [userA],
    );
    assert.equal(legacy.rows[0].favorites["52772"].note, "Mažiau druskos");
  } finally {
    await db.close();
  }
});

test("Invalid legacy data rolls back the migration instead of silently losing recipes", async () => {
  const db = await setup();
  try {
    await db.query("insert into public.account_data (user_id,favorites) values ($1,$2)", [
      userA,
      JSON.stringify({ "52772": fixture("52772", "a".repeat(3001)) }),
    ]);
    const sql = await readFile(
      new URL("../supabase/migrations/20261116_favorites.sql", import.meta.url),
      "utf8",
    );
    await assert.rejects(db.exec(sql), /Legacy favorites contain invalid records/);
    await db.exec("rollback");
    const result = await db.query<{ relation: string | null }>(
      "select to_regclass('public.favorites') as relation",
    );
    assert.equal(result.rows[0].relation, null);
    assert.equal((await db.query("select * from public.account_data")).rows.length, 1);
  } finally {
    await db.close();
  }
});
