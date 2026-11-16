import type { SupabaseClient } from "@supabase/supabase-js";
import type { Favorite, Meal } from "./types";

const columns = "recipe_id,recipe_name,image_url,recipe_data,note";
type FavoriteRow = {
  recipe_id: string;
  recipe_name: string;
  image_url: string;
  recipe_data: Meal;
  note: string;
};

function toFavorite(row: FavoriteRow): Favorite {
  return {
    meal: { ...row.recipe_data, id: row.recipe_id, name: row.recipe_name, image: row.image_url },
    note: row.note,
  };
}

export async function loadFavorites(client: SupabaseClient, userId: string) {
  // Read in pages: PostgREST commonly caps each response at 1,000 rows.
  const favorites: Record<string, Favorite> = {};
  const size = 500;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await client
      .from("favorites")
      .select(columns)
      .eq("user_id", userId)
      .order("id")
      .range(offset, offset + size - 1);
    if (error) throw error;
    for (const row of data as FavoriteRow[]) favorites[row.recipe_id] = toFavorite(row);
    if (data.length < size) return favorites;
  }
}

export async function insertFavorite(client: SupabaseClient, userId: string, meal: Meal) {
  // A second save from another device must never erase an existing personal note.
  const { data, error } = await client
    .from("favorites")
    .upsert(
      {
        user_id: userId,
        recipe_id: meal.id,
        recipe_name: meal.name,
        image_url: meal.image,
        recipe_data: meal,
      },
      { onConflict: "user_id,recipe_id", ignoreDuplicates: true },
    )
    .select(columns)
    .maybeSingle();
  if (error) throw error;
  if (data) return toFavorite(data as FavoriteRow);
  const existing = await client
    .from("favorites")
    .select(columns)
    .eq("user_id", userId)
    .eq("recipe_id", meal.id)
    .single();
  if (existing.error) throw existing.error;
  return toFavorite(existing.data as FavoriteRow);
}

export async function updateFavoriteNote(
  client: SupabaseClient,
  userId: string,
  recipeId: string,
  note: string,
) {
  const { data, error } = await client
    .from("favorites")
    .update({ note })
    .eq("user_id", userId)
    .eq("recipe_id", recipeId)
    .select(columns)
    .single();
  if (error) throw error;
  return toFavorite(data as FavoriteRow);
}

export async function deleteFavorite(client: SupabaseClient, userId: string, recipeId: string) {
  const { error } = await client
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("recipe_id", recipeId);
  if (error) throw error;
}
