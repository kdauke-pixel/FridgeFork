"use client";

import { lithuanianValidation } from "@/lib/form-validation";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Heart, Plus, Sparkles, Trash2 } from "lucide-react";
import { useApp } from "./provider";
import { Fridge, IngredientPicker } from "./fridge";
import { ingredientLabel, ingredients } from "@/lib/ingredients";
import { RecipeGrid } from "./recipes";
import { Dialog } from "./dialog";
import type { Adaptation } from "@/lib/types";

export function AccountGate({ children }: { children: React.ReactNode }) {
  const { session, ready, requireAuth } = useApp();
  if (!ready)
    return (
      <div className="empty-state" role="status">
        <h2>Ruošiame tavo kolekciją…</h2>
        <p>Jei duomenų įkelti nepavyksta, perkrauk puslapį.</p>
      </div>
    );
  if (!session)
    return (
      <div className="account-gate">
        <span className="gate-icon">
          <Heart size={28} />
        </span>
        <div className="eyebrow">TAVO ASMENINĖ VIRTUVĖ</div>
        <h2>
          Geriausias idėjas
          <br />
          <em>pasilik sau.</em>
        </h2>
        <p>Prisijunk, kad galėtum išsaugoti receptus ir atrasti savo skonių kolekciją.</p>
        <button className="button button-primary" onClick={() => requireAuth()}>
          Prisijungti <ArrowUpRight size={18} />
        </button>
      </div>
    );
  return children;
}

export function KitchenPage() {
  const { data, toggleIngredient, session, ready } = useApp();
  const [ingredient, setIngredient] = useState("");
  return (
    <div className="interior-page">
      <div className="page-intro">
        <div className="eyebrow">TAVO PRODUKTAI. TAVO GALIMYBĖS.</div>
        <h1>
          Mano <em>virtuvė</em>
          <span className="orange-dot">.</span>
        </h1>
        <p>Atverk šaldytuvą ir pažymėk, ką turi. Iš paprastų produktų gimsta geriausios idėjos.</p>
      </div>
      <div className="kitchen-layout">
        <div className="kitchen-fridge-panel">
          <Fridge large />
        </div>
        <section className="pantry-panel">
          <div className="eyebrow">ŠIANDIEN ŠALDYTUVE</div>
          <h2>
            Kas gero <em>viduje?</em>
          </h2>
          <p>
            {session
              ? "Produktai išsaugomi tavo paskyroje."
              : "Produktai išsaugomi šiame įrenginyje. Prisijungus perkelsime juos į paskyrą."}
          </p>
          <form
            className="add-ingredient-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (ingredient && !data.pantry.includes(ingredient))
                await toggleIngredient(ingredient);
              setIngredient("");
            }}
          >
            <label className="sr-only" htmlFor="add-product">
              Pridėti produktą
            </label>
            <select
              id="add-product"
              value={ingredient}
              required
              {...lithuanianValidation}
              onChange={(event) => setIngredient(event.target.value)}
            >
              <option value="">Pasirink produktą…</option>
              {ingredients
                .filter((item) => !data.pantry.includes(item.id))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
            </select>
            <button
              className="button button-primary"
              disabled={!ingredient || !ready}
              aria-label="Pridėti pasirinktą produktą"
            >
              <Plus size={18} />
            </button>
          </form>
          <div className="pantry-selected">
            {data.pantry.length ? (
              data.pantry.map((id) => (
                <button
                  key={id}
                  className="selected-product"
                  onClick={() => void toggleIngredient(id)}
                  disabled={!ready}
                  aria-label={`Pašalinti: ${ingredientLabel(id)}`}
                >
                  {ingredients.find((item) => item.id === id)?.emoji} {ingredientLabel(id)}{" "}
                  <span>×</span>
                </button>
              ))
            ) : (
              <p className="subtle">Kol kas tuščia. Pasirink pirmą produktą.</p>
            )}
          </div>
          <Link
            className={`button button-dark ${!data.pantry.length ? "disabled-link" : ""}`}
            aria-disabled={!data.pantry.length}
            tabIndex={data.pantry.length ? 0 : -1}
            href={
              data.pantry.length
                ? `/?ingredients=${encodeURIComponent(data.pantry.join(","))}#receptai`
                : "#"
            }
          >
            Ką iš to pagaminti? <ArrowUpRight size={18} />
          </Link>
        </section>
      </div>
      <section className="all-products-section">
        <div className="section-heading">
          <h2>
            Maži produktai. <em>Didelės idėjos.</em>
          </h2>
        </div>
        <IngredientPicker all />
      </section>
    </div>
  );
}

export function SavedPage() {
  const { data } = useApp();
  const [category, setCategory] = useState("");
  const meals = Object.values(data.favorites).map((item) => item.meal);
  const categories = [...new Set(meals.map((meal) => meal.category).filter(Boolean))];
  return (
    <div className="interior-page">
      <div className="page-intro">
        <div className="eyebrow">RECEPTAI, PRIE KURIŲ NORISI SUGRĮŽTI</div>
        <h1>
          Mano <em>receptai</em>
          <span className="orange-dot">.</span>
        </h1>
        <p>Tavo skonių kolekcija. Atidaryk receptą ir palik pastabą kitam kartui.</p>
      </div>
      <AccountGate>
        {!meals.length ? (
          <div className="empty-state">
            <Heart size={38} />
            <h2>Kolekcija laukia pirmo skonio</h2>
            <p>Paspausk širdelę prie patikusio recepto.</p>
            <Link href="/" className="button button-primary">
              Atrasti receptus <ArrowUpRight size={17} />
            </Link>
          </div>
        ) : (
          <>
            <div className="category-bar">
              <button
                className={`category-pill ${!category ? "active" : ""}`}
                onClick={() => setCategory("")}
              >
                Visi receptai
              </button>
              {categories.map((item) => (
                <button
                  className={`category-pill ${category === item ? "active" : ""}`}
                  key={item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <RecipeGrid meals={meals.filter((meal) => !category || meal.category === category)} />
          </>
        )}
      </AccountGate>
    </div>
  );
}

export function AdaptationsPage() {
  const { data, patchData, notice } = useApp();
  const [selected, setSelected] = useState<Adaptation | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="interior-page">
      <div className="page-intro">
        <div className="eyebrow">KLASIKINIAI RECEPTAI. TAVO TAISYKLĖS.</div>
        <h1>
          Mano <em>AI receptai</em>
          <span className="orange-dot">.</span>
        </h1>
        <p>Receptai, kuriuos pritaikėme tavo virtuvei ir norams.</p>
      </div>
      <AccountGate>
        {!data.adaptations.length ? (
          <div className="empty-state">
            <Sparkles size={38} />
            <h2>Čia prasidės tavo eksperimentai</h2>
            <p>Atidaryk receptą, pasirink „Pritaikyti su AI“ ir išsaugok rezultatą.</p>
            <Link href="/" className="button button-primary">
              Atrasti receptus <ArrowUpRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="recipe-grid">
            {data.adaptations.map((item) => (
              <article className="recipe-card adaptation-card" key={item.id}>
                <button className="recipe-image-button" onClick={() => setSelected(item)}>
                  <img src={item.meal.image} alt={item.meal.name} loading="lazy" />
                </button>
                <div className="recipe-info">
                  <div className="eyebrow">
                    <Sparkles size={13} /> PRITAIKYTA TAU
                  </div>
                  <button className="recipe-title" onClick={() => setSelected(item)}>
                    <h3>{item.meal.name}</h3>
                    <ArrowUpRight size={18} />
                  </button>
                  <p>{item.request}</p>
                  <div className="adaptation-footer">
                    <span>{new Date(item.createdAt).toLocaleDateString("lt-LT")}</span>
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label={`Ištrinti AI receptą ${item.meal.name}`}
                      onClick={async () => {
                        setBusy(true);
                        if (
                          await patchData("adaptations", (current) =>
                            current.filter((saved) => saved.id !== item.id),
                          )
                        )
                          notice("AI receptas pašalintas.");
                        setBusy(false);
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AccountGate>
      {selected && (
        <Dialog
          title={selected.meal.name}
          close={() => setSelected(null)}
          className="recipe-dialog"
        >
          <img className="drawer-hero" src={selected.meal.image} alt={selected.meal.name} />
          <div className="drawer-body">
            <div className="eyebrow">TAVO AI RECEPTAS</div>
            <h2>{selected.meal.name}</h2>
            <h3>Tavo prašymas</h3>
            <p>{selected.request}</p>
            <h3>AI pritaikymas</h3>
            <div className="preserve-lines">{selected.result}</div>
            <details className="original-recipe">
              <summary>Peržiūrėti išsaugotą originalų receptą</summary>
              <h3>Ingredientai</h3>
              <ul>
                {selected.meal.ingredients.map((item, index) => (
                  <li key={index}>
                    {item.measure} {item.name}
                  </li>
                ))}
              </ul>
              <div className="preserve-lines">
                {selected.meal.instructions || "Originalo instrukcijos neįkeltos."}
              </div>
            </details>
          </div>
        </Dialog>
      )}
    </div>
  );
}
