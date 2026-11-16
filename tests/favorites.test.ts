import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  deleteFavorite,
  insertFavorite,
  loadFavorites,
  updateFavoriteNote,
} from "../src/lib/favorites";
import { normalizeMeal } from "../src/lib/meals";

const meal = normalizeMeal({
  idMeal: "52772",
  strMeal: "Chicken",
  strMealThumb: "https://example.com/image.jpg",
});
const row = {
  recipe_id: meal.id,
  recipe_name: meal.name,
  image_url: meal.image,
  recipe_data: meal,
  note: "Existing note",
};
function client(fetcher: typeof fetch) {
  return createClient("https://test.supabase.co", "test-public-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetcher },
  });
}

test("Saving a duplicate favorite preserves the existing note instead of overwriting it", async () => {
  let calls = 0;
  const db = client(async (input, init) => {
    calls++;
    const url = new URL(String(input));
    if (calls === 1) {
      assert.equal(init?.method, "POST");
      assert.equal(url.pathname, "/rest/v1/favorites");
      assert.equal(url.searchParams.get("on_conflict"), "user_id,recipe_id");
      assert.ok(new Headers(init?.headers).get("prefer")?.includes("resolution=ignore-duplicates"));
      const body = JSON.parse(String(init?.body));
      assert.equal(body.user_id, "user-a");
      assert.equal(body.recipe_id, meal.id);
      assert.ok(!("note" in body));
      return Response.json([]);
    }
    assert.equal(url.searchParams.get("user_id"), "eq.user-a");
    assert.equal(url.searchParams.get("recipe_id"), "eq.52772");
    return Response.json(row);
  });
  assert.equal((await insertFavorite(db, "user-a", meal)).note, "Existing note");
  assert.equal(calls, 2);
});

test("Updating a note changes only its column and targets one user's recipe", async () => {
  const db = client(async (input, init) => {
    const url = new URL(String(input));
    assert.equal(init?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(init?.body)), { note: "" });
    assert.equal(url.searchParams.get("user_id"), "eq.user-a");
    assert.equal(url.searchParams.get("recipe_id"), "eq.52772");
    return Response.json({ ...row, note: "" });
  });
  assert.equal((await updateFavoriteNote(db, "user-a", meal.id, "")).note, "");
  const missing = client(async () =>
    Response.json({ code: "PGRST116", message: "No visible recipe" }, { status: 406 }),
  );
  await assert.rejects(updateFavoriteNote(missing, "user-a", meal.id, "New note"));
});

test("Loading and deleting favorites filter by owner without touching account_data", async () => {
  const db = client(async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/rest/v1/favorites");
    assert.equal(url.searchParams.get("user_id"), "eq.user-a");
    if (init?.method === "DELETE") {
      assert.equal(url.searchParams.get("recipe_id"), "eq.52772");
      return new Response(null, { status: 204 });
    }
    return Response.json([row]);
  });
  const favorites = await loadFavorites(db, "user-a");
  assert.equal(favorites[meal.id].note, "Existing note");
  assert.equal(favorites[meal.id].meal.name, meal.name);
  await deleteFavorite(db, "user-a", meal.id);
});
