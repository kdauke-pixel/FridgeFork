import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMeal, rankMeals } from "../src/lib/meals";
import { recipeActionPath, safeReturnPath } from "../src/lib/routing";
import { safeSupabaseEndpoint } from "../src/lib/supabase";

test("MealDB normalization keeps quantities and discards empty ingredient slots", () => {
  const meal = normalizeMeal({
    idMeal: "42",
    strMeal: "Soup",
    strIngredient1: " Carrot ",
    strMeasure1: " 2 ",
    strIngredient2: " ",
    strIngredient20: "Salt",
  });
  assert.equal(meal.id, "42");
  assert.deepEqual(meal.ingredients, [
    { name: "Carrot", measure: "2" },
    { name: "Salt", measure: "" },
  ]);
  assert.equal(meal.instructions, "");
});

test("Multiple ingredient results count distinct matching ingredients, then rank deterministically", () => {
  const first = normalizeMeal({ idMeal: "1", strMeal: "A" });
  const second = normalizeMeal({ idMeal: "2", strMeal: "B" });
  const third = normalizeMeal({ idMeal: "3", strMeal: "C" });
  const ranked = rankMeals([[first, second, second], [second, third], [second]]);
  assert.deepEqual(
    ranked.map((meal) => [meal.id, meal.matches]),
    [
      ["2", 3],
      ["1", 1],
      ["3", 1],
    ],
  );
  assert.deepEqual(rankMeals([[], []]), []);
});

test("Return URL preserves the recipe and blocks external URLs and auth loops", () => {
  assert.equal(
    safeReturnPath("/mano-receptai?receptas=52772#pastabos"),
    "/mano-receptai?receptas=52772#pastabos",
  );
  for (const path of [
    null,
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/prisijungti?next=/registruotis",
    "/../registruotis",
    "/naujas-slaptazodis",
  ])
    assert.equal(safeReturnPath(path), "/");
});

test("Developer diagnostics strip query secrets and unrecognized Supabase paths", () => {
  assert.equal(
    safeSupabaseEndpoint(
      "https://example.supabase.co/auth/v1/token?grant_type=password&secret=never-show",
    ),
    "/auth/v1/token",
  );
  assert.equal(
    safeSupabaseEndpoint(
      "https://example.supabase.co/rest/v1/account_data?user_id=eq.private-id&select=*",
    ),
    "/rest/v1/account_data",
  );
  assert.equal(
    safeSupabaseEndpoint("https://example.supabase.co/auth/v1/private-token-value"),
    "/auth/v1/session",
  );
  assert.equal(
    safeSupabaseEndpoint(
      "https://example.supabase.co/rest/v1/favorites?user_id=eq.private-id&recipe_id=eq.52772",
    ),
    "/rest/v1/favorites",
  );
});

test("Recipe actions preserve the current search and resume the intended recipe after login", () => {
  const url = new URL(
    recipeActionPath("/?ingredients=chicken,tomato", "52772", "save"),
    "https://fridgefork.local",
  );
  assert.equal(url.searchParams.get("ingredients"), "chicken,tomato");
  assert.equal(url.searchParams.get("receptas"), "52772");
  assert.equal(url.searchParams.get("veiksmas"), "save");
});
