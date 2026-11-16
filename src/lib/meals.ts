import type { Meal } from "./types";

export function normalizeMeal(raw: Record<string, unknown>): Meal {
  const ingredients: Meal["ingredients"] = [];
  for (let index = 1; index <= 20; index++) {
    const name = String(raw[`strIngredient${index}`] ?? "").trim();
    if (name) ingredients.push({ name, measure: String(raw[`strMeasure${index}`] ?? "").trim() });
  }
  return {
    id: String(raw.idMeal),
    name: String(raw.strMeal ?? ""),
    image: String(raw.strMealThumb ?? ""),
    category: String(raw.strCategory ?? ""),
    area: String(raw.strArea ?? ""),
    instructions: String(raw.strInstructions ?? ""),
    ingredients,
  };
}

export function rankMeals(groups: Meal[][]): Meal[] {
  const ranked = new Map<string, Meal>();
  for (const group of groups) {
    for (const meal of new Map(group.map((item) => [item.id, item])).values()) {
      const previous = ranked.get(meal.id);
      ranked.set(meal.id, { ...meal, matches: (previous?.matches ?? 0) + 1 });
    }
  }
  return [...ranked.values()].sort(
    (a, b) => (b.matches ?? 0) - (a.matches ?? 0) || a.name.localeCompare(b.name),
  );
}
