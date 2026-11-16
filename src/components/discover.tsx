"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Fridge, IngredientPicker, AIBanner } from "./fridge";
import { RecipeGrid } from "./recipes";
import { useApp } from "./provider";
import { categories } from "@/lib/ingredients";
import { api } from "@/lib/telemetry";
import type { Meal } from "@/lib/types";

export function DiscoverPage() {
  const { data, notice } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [limit, setLimit] = useState(12);
  const category = params.get("category") ?? "";
  const query = params.get("q") ?? "";
  const selected = params.get("ingredients") ?? "";
  const mode = params.get("mode") ?? "name";
  const requestParams = new URLSearchParams();
  if (selected) requestParams.set("ingredients", selected);
  else if (query && mode === "ingredient") requestParams.set("ingredients", query.toLowerCase());
  else if (query) requestParams.set("q", query);
  else if (category) requestParams.set("category", category);
  const endpoint = `/api/meals?${requestParams}`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setLimit(12);
    api<{ meals: Meal[] }>(endpoint, { signal: controller.signal })
      .then((body) => {
        if (!controller.signal.aborted) setMeals(body.meals);
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, attempt]);
  function searchPantry() {
    if (!data.pantry.length) {
      notice("Pirmiausia pasirink bent vieną produktą.");
      return;
    }
    router.push(`/?ingredients=${encodeURIComponent(data.pantry.join(","))}#receptai`);
  }
  const filtered = !!(category || query || selected);
  return (
    <div className="discover-page">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-star">✳</span> ĮKVĖPIMAS PRASIDEDA TAVO VIRTUVĖJE
          </div>
          <h1>
            Nuo šaldytuvo
            <br />
            iki{" "}
            <em>
              lėkštės<span className="hero-dot">.</span>
            </em>
          </h1>
          <p>
            Geriausi receptai prasideda nuo to, ką jau turi.
            <br className="desktop-break" /> Atverk šaldytuvą — atrask naujų skonių.
          </p>
          <a href="#produktai" className="button button-primary">
            Atrasti receptus <ArrowUpRight size={19} />
          </a>
          <div className="hero-footnote">
            <span className="hero-mini-icons">🍅 🥑 🥕</span>
            <span>
              Mažiau švaistymo. <strong>Daugiau skanaus.</strong>
            </span>
          </div>
        </div>
        <Fridge />
        <a href="#produktai" className="hero-scroll" aria-label="Pereiti prie ingredientų">
          <ArrowDown size={18} />
        </a>
      </section>
      <div className="editorial-strip">
        <span>GAMINK IŠ TO, KĄ TURI</span>
        <span>✳</span>
        <span>ATRASK NAUJUS SKONIUS</span>
        <span>✳</span>
        <span>MAŽIAU ŠVAISTYK</span>
        <span>✳</span>
        <span>DAUGIAU MĖGAUKIS</span>
      </div>
      <section id="produktai" className="ingredients-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">01 / PRADĖKIME NUO PRODUKTŲ</div>
            <h2>
              Ką turi savo <em>virtuvėje?</em>
            </h2>
          </div>
          <button className="text-button" onClick={searchPantry}>
            Ieškoti receptų{" "}
            {data.pantry.length > 0 && <span className="count-pill">{data.pantry.length}</span>}
            <ArrowRight size={19} />
          </button>
        </div>
        <p className="section-description">Pasirink produktus — mes pasirūpinsime idėjomis.</p>
        <IngredientPicker />
        <div className="ingredients-note">
          <span>✧ Geri patiekalai nebūtinai prasideda nuo pirkinių sąrašo.</span>
          <a href="/mano-virtuve">
            Visi produktai <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
      <section id="receptai" className="catalog-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">02 / ŠIEK TIEK ĮKVĖPIMO</div>
            <h2>
              {query ? (
                <>
                  Rezultatai: <em>{query}</em>
                </>
              ) : selected ? (
                <>
                  Idėjos iš tavo <em>produktų</em>
                </>
              ) : (
                <>
                  Idėjos tavo <em>stalui</em>
                </>
              )}
            </h2>
          </div>
          <span className="catalog-caption">
            <Sparkles size={15} /> Kasdien skaniau
          </span>
        </div>
        <div className="category-bar" aria-label="Receptų kategorijos">
          {categories.map((item) => (
            <button
              key={item.id}
              className={`category-pill ${category === item.id && !query && !selected ? "active" : ""}`}
              onClick={() => router.push(item.id ? `/?category=${item.id}#receptai` : "/#receptai")}
              aria-pressed={category === item.id && !query && !selected}
            >
              <span aria-hidden="true">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
        {filtered && (
          <div className="results-summary">
            <span>
              {loading ? "Ieškome skanių idėjų…" : `${meals.length} receptų`}
              {selected && " · pagal ingredientų atitikimus"}
            </span>
            <button className="text-button" onClick={() => router.push("/#receptai")}>
              Išvalyti filtrus ×
            </button>
          </div>
        )}
        <RecipeGrid
          meals={meals.slice(0, limit)}
          loading={loading}
          error={error}
          retry={() => setAttempt(attempt + 1)}
        />
        {!loading && !error && meals.length > limit && (
          <div className="load-more">
            <button className="button button-outline" onClick={() => setLimit(limit + 12)}>
              Daugiau skanių idėjų <ArrowDown size={17} />
            </button>
          </div>
        )}
      </section>
      <AIBanner />
    </div>
  );
}
