"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Heart, SearchX } from "lucide-react";
import { useApp } from "./provider";
import type { Meal } from "@/lib/types";
import { api } from "@/lib/telemetry";
import { recipeActionPath } from "@/lib/routing";

export function useOpenRecipe() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (id: string) => {
    const query = new URLSearchParams(params.toString());
    query.set("receptas", id);
    router.push(`${pathname}?${query}`, { scroll: false });
  };
}

export function RecipeCard({ meal }: { meal: Meal }) {
  const { data, saveFavorite, removeFavorite, requireAuth, notice, ready } = useApp();
  const [busy, setBusy] = useState(false);
  const open = useOpenRecipe();
  const saved = !!data.favorites[meal.id];
  async function toggle() {
    if (
      !requireAuth(
        recipeActionPath(window.location.pathname + window.location.search, meal.id, "save"),
      )
    )
      return;
    setBusy(true);
    try {
      // Ingredient/category filter responses contain only a thumbnail. Save a complete recipe.
      const complete =
        !saved && !meal.instructions
          ? (await api<{ meals: Meal[] }>(`/api/meals?id=${meal.id}`)).meals[0]
          : meal;
      if (!complete) throw new Error("Recepto išsaugoti nepavyko.");
      if (await (saved ? removeFavorite(meal.id) : saveFavorite(complete)))
        notice(
          saved ? "Receptas pašalintas iš mėgstamų." : "Receptas išsaugotas tavo kolekcijoje.",
        );
    } catch (error) {
      notice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="recipe-card">
      <div className="recipe-image-wrap">
        <button
          className="recipe-image-button"
          onClick={() => open(meal.id)}
          aria-label={`Atidaryti receptą ${meal.name}`}
        >
          <img src={meal.image} alt={meal.name} loading="lazy" />
        </button>
        <button
          className={`favorite-button ${saved ? "saved" : ""}`}
          aria-label={saved ? `Pašalinti ${meal.name} iš mėgstamų` : `Išsaugoti ${meal.name}`}
          aria-pressed={saved}
          disabled={busy || !ready}
          onClick={() => void toggle()}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
        {meal.matches !== undefined && (
          <span className="match-badge">{meal.matches} produktų atitik.</span>
        )}
      </div>
      <div className="recipe-info">
        <div className="recipe-meta">
          <span>{meal.category || "ATRASK SKONĮ"}</span>
          <span>#{meal.id}</span>
        </div>
        <button className="recipe-title" onClick={() => open(meal.id)}>
          <h3>{meal.name}</h3>
          <ArrowUpRight size={20} />
        </button>
        <div className="recipe-bottom">
          <span>{meal.area || "Idėja tavo virtuvei"}</span>
          <span>Gaminam kartu ↗</span>
        </div>
      </div>
    </article>
  );
}

export function RecipeGrid({
  meals,
  loading = false,
  error = "",
  retry,
}: {
  meals: Meal[];
  loading?: boolean;
  error?: string;
  retry?: () => void;
}) {
  if (loading)
    return (
      <div className="recipe-grid" aria-label="Kraunami receptai" role="status">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="recipe-skeleton" key={index}>
            <div />
            <span />
            <span />
          </div>
        ))}
      </div>
    );
  if (error)
    return (
      <div className="empty-state" role="alert">
        <SearchX size={36} />
        <h3>Nepavyko užkurti virtuvės</h3>
        <p>{error}</p>
        {retry && (
          <button className="button button-outline" onClick={retry}>
            Bandyti dar kartą
          </button>
        )}
      </div>
    );
  if (!meals.length)
    return (
      <div className="empty-state">
        <SearchX size={36} />
        <h3>Šįkart receptų neradome</h3>
        <p>Pabandyk kitą ingredientą arba recepto pavadinimą angliškai.</p>
      </div>
    );
  return (
    <div className="recipe-grid">
      {meals.map((meal) => (
        <RecipeCard meal={meal} key={meal.id} />
      ))}
    </div>
  );
}
