import { NextRequest, NextResponse } from "next/server";
import { normalizeMeal, rankMeals } from "@/lib/meals";
import type { Meal, Operation } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const operations: Operation[] = [];
  async function load(endpoint: string): Promise<Meal[]> {
    const started = performance.now();
    let status = 0;
    let ok = false;
    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/${endpoint}`, {
        signal: AbortSignal.timeout(12000),
        next: { revalidate: 3600 },
      });
      status = response.status;
      if (!response.ok) throw new Error("upstream");
      const data = await response.json();
      const meals = (data.meals ?? []).map(normalizeMeal);
      ok = true;
      return meals;
    } finally {
      operations.push({
        system: "TheMealDB",
        endpoint: `/api/json/v1/1/${endpoint.split("?")[0]}`,
        method: "GET",
        status,
        ok,
        duration: Math.round(performance.now() - started),
      });
    }
  }
  try {
    const id = params.get("id");
    const query = (params.get("q") ?? "").trim().slice(0, 100);
    const selected = [...new Set((params.get("ingredients") ?? "").split(",").filter(Boolean))];
    if (selected.length > 12 || selected.some((item) => !/^[a-zA-Z _-]{1,60}$/.test(item)))
      return NextResponse.json(
        { error: "Pasirinkite iki 12 ingredientų.", operations },
        { status: 400 },
      );
    let meals: Meal[];
    if (id) {
      if (!/^\d{1,10}$/.test(id))
        return NextResponse.json({ error: "Neteisingas recepto ID.", operations }, { status: 400 });
      meals = await load(`lookup.php?i=${id}`);
    } else if (selected.length) {
      const results = await Promise.allSettled(
        selected.map((item) => load(`filter.php?i=${encodeURIComponent(item)}`)),
      );
      // Wait for all operations, then fail visibly instead of presenting partial ranking as complete.
      if (results.some((result) => result.status === "rejected")) throw new Error("upstream");
      meals = rankMeals(
        results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])),
      );
    } else if (params.get("category")) {
      meals = await load(
        `filter.php?c=${encodeURIComponent(params.get("category")!.slice(0, 60))}`,
      );
      meals = meals.map((meal) => ({ ...meal, category: params.get("category")!.slice(0, 60) }));
    } else {
      meals = await load(`search.php?s=${encodeURIComponent(query || "")}`);
    }
    return NextResponse.json({ meals, operations });
  } catch {
    return NextResponse.json(
      { error: "Receptų šaltinis šiuo metu nepasiekiamas. Pabandykite dar kartą.", operations },
      { status: 502 },
    );
  }
}
