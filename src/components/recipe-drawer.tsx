"use client";

import { lithuanianValidation } from "@/lib/form-validation";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart, Sparkles, Check } from "lucide-react";
import { Dialog } from "./dialog";
import { useApp } from "./provider";
import { api } from "@/lib/telemetry";
import { ingredientLabel } from "@/lib/ingredients";
import type { Meal } from "@/lib/types";
import { recipeActionPath } from "@/lib/routing";
import { RecipeNotes } from "./recipe-notes";

export function RecipeDrawer({ id, close }: { id: string; close: () => void }) {
  const { data, session, requireAuth, patchData, saveFavorite, removeFavorite, notice, ready } =
    useApp();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [adapt, setAdapt] = useState(false);
  const [request, setRequest] = useState("");
  const [includePantry, setIncludePantry] = useState(true);
  const [result, setResult] = useState("");
  const [resultRequest, setResultRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [adaptError, setAdaptError] = useState("");
  const generation = useRef(0);
  const [saving, setSaving] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handledAction = useRef("");
  const accountVersion = useRef(0);
  const action = params.get("veiksmas");
  useEffect(() => {
    const controller = new AbortController();
    generation.current++;
    setBusy(false);
    setRequest("");
    setAdaptError("");
    setMeal(null);
    setError("");
    setAdapt(false);
    setResult("");
    setResultSaved(false);
    api<{ meals: Meal[] }>(`/api/meals?id=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((body) => {
        if (!controller.signal.aborted) {
          if (body.meals[0]) setMeal(body.meals[0]);
          else setError("Šio recepto neradome.");
        }
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => {
      controller.abort();
      generation.current++;
    };
  }, [id, retry]);
  const favorite = data.favorites[id];

  useEffect(() => {
    accountVersion.current++;
    generation.current++;
    setAdaptError("");
    setRequest("");
    setResult("");
    setResultSaved(false);
    setAdapt(false);
    setBusy(false);
  }, [session?.user.id]);

  useEffect(() => {
    if (!ready || !session || !meal || meal.id !== id || !["save", "adapt"].includes(action ?? ""))
      return;
    const actionKey = `${id}:${action}`;
    if (handledAction.current === actionKey) return;
    handledAction.current = actionKey;
    const query = new URLSearchParams(params.toString());
    query.delete("veiksmas");
    router.replace(`${pathname}?${query}`, { scroll: false });
    if (action === "adapt") setAdapt(true);
    else {
      setSaving(true);
      void saveFavorite(meal).then((ok) => {
        if (ok) notice("Receptas išsaugotas.");
        setSaving(false);
      });
    }
  }, [ready, session, meal, action, id, params, pathname, router, saveFavorite, notice]);

  async function toggleFavorite() {
    if (
      !meal ||
      !requireAuth(recipeActionPath(window.location.pathname + window.location.search, id, "save"))
    )
      return;
    setSaving(true);
    if (await (favorite ? removeFavorite(id) : saveFavorite(meal)))
      notice(favorite ? "Receptas pašalintas." : "Receptas išsaugotas.");
    setSaving(false);
  }
  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (!meal || busy || !request.trim() || !requireAuth() || !session) return;
    const version = accountVersion.current;
    const run = ++generation.current;
    const submittedRequest = request.trim();
    setBusy(true);
    setAdaptError("");
    setResult("");
    setResultSaved(false);
    try {
      const response = await api<{ text: string }>("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mode: "adapt",
          recipe: meal,
          request: submittedRequest,
          pantry: includePantry ? data.pantry.map(ingredientLabel) : [],
        }),
      });
      if (version !== accountVersion.current || run !== generation.current) return;
      setResult(response.text);
      setResultRequest(submittedRequest);
    } catch (error) {
      if (version === accountVersion.current && run === generation.current)
        setAdaptError((error as Error).message);
    } finally {
      if (version === accountVersion.current && run === generation.current) setBusy(false);
    }
  }
  async function saveAdaptation() {
    if (!meal || !requireAuth()) return;
    setSaving(true);
    const ok = await patchData("adaptations", (current) => [
      {
        id: crypto.randomUUID(),
        meal,
        request: resultRequest,
        result,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    if (ok) {
      setResultSaved(true);
      notice("AI receptas išsaugotas.");
    }
    setSaving(false);
  }
  return (
    <Dialog title={meal?.name ?? "Recepto peržiūra"} close={close} className="recipe-dialog">
      {error ? (
        <div className="empty-state" role="alert">
          <h2>Recepto įkelti nepavyko</h2>
          <p>{error}</p>
          <button className="button button-outline" onClick={() => setRetry(retry + 1)}>
            Bandyti dar kartą
          </button>
        </div>
      ) : !meal ? (
        <div className="drawer-loading" role="status">
          Kraunamas receptas…
        </div>
      ) : (
        <>
          <img className="drawer-hero" src={meal.image} alt={meal.name} />
          <div className="drawer-body">
            <div className="eyebrow">
              {meal.category} · {meal.area} · #{meal.id}
            </div>
            <h2>{meal.name}</h2>
            <div className="drawer-actions">
              <button
                className="button button-outline"
                disabled={saving || !ready}
                onClick={() => void toggleFavorite()}
              >
                <Heart size={17} fill={favorite ? "currentColor" : "none"} />
                {favorite ? "Išsaugotas" : "Išsaugoti"}
              </button>
              <button
                className="button button-primary"
                onClick={() => {
                  if (
                    requireAuth(
                      recipeActionPath(
                        window.location.pathname + window.location.search,
                        id,
                        "adapt",
                      ),
                    )
                  )
                    setAdapt(!adapt);
                }}
                aria-expanded={adapt}
              >
                <Sparkles size={17} /> Pritaikyti receptą
              </button>
            </div>
            {adapt && (
              <section className="adapt-section">
                <h3>AI recepto gelbėtojas</h3>
                <p>Ko trūksta arba ką norėtum pakeisti?</p>
                <form onSubmit={generate}>
                  <label htmlFor="adapt-request">Tavo prašymas</label>
                  <textarea
                    id="adapt-request"
                    required
                    disabled={busy}
                    {...lithuanianValidation}
                    maxLength={4000}
                    value={request}
                    onChange={(event) => setRequest(event.target.value)}
                    placeholder="Pvz., pakeisk pieną augaliniu gėrimu ir pritaikyk 2 porcijoms."
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includePantry}
                      onChange={(event) => setIncludePantry(event.target.checked)}
                    />{" "}
                    Pridėti „Mano virtuvės“ produktus
                  </label>
                  <button className="button button-dark" disabled={busy || !request.trim()}>
                    {busy ? "AI kuria receptą…" : "Pritaikyti receptą"}
                    <Sparkles size={16} />
                  </button>
                </form>
                {busy && <p role="status">Pritaikome receptą pagal tavo situaciją…</p>}
                {adaptError && (
                  <p className="inline-error" role="alert">
                    {adaptError}
                  </p>
                )}
                {result && (
                  <div className="ai-result">
                    <div className="eyebrow">
                      <Sparkles size={14} /> TAVO AI RECEPTAS
                    </div>
                    <div className="preserve-lines">{result}</div>
                    <button
                      className="button button-outline"
                      disabled={saving || resultSaved}
                      onClick={() => void saveAdaptation()}
                    >
                      <Check size={16} />
                      {resultSaved ? "Išsaugota" : "Išsaugoti AI receptą"}
                    </button>
                  </div>
                )}
              </section>
            )}
            <h3>Ingredientai</h3>
            <ul className="recipe-ingredients">
              {meal.ingredients.map((item, index) => (
                <li key={index}>
                  <span>{item.name}</span>
                  <strong>{item.measure}</strong>
                </li>
              ))}
            </ul>
            <h3>Gaminimo eiga</h3>
            <div className="instructions">
              {meal.instructions
                .split(/\r?\n/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
            {favorite && (
              <RecipeNotes key={`${session?.user.id}:${id}`} id={id} favorite={favorite} />
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}
