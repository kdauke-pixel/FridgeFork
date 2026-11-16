"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { ingredients } from "@/lib/ingredients";
import { useApp } from "./provider";

export function Fridge({ large = false }: { large?: boolean }) {
  const [open, setOpen] = useState(false);
  const { data, toggleIngredient, ready } = useApp();
  return (
    <div className={`fridge-scene ${large ? "large-fridge" : ""}`}>
      <span className="scene-spark spark-one">✳</span>
      <span className="scene-spark spark-two">✧</span>
      <span className="fridge-caption">atidaryk. atrask. gamink.</span>
      <div className={`fridge ${open ? "fridge-open" : ""}`}>
        <div className="fridge-inside">
          <span className="inside-label">TAVO MAŽAS SKONIŲ PASAULIS</span>
          <div className="fridge-shelves">
            {ingredients.slice(0, 9).map((item) => (
              <button
                key={item.id}
                disabled={!ready || !open}
                tabIndex={open ? 0 : -1}
                className={data.pantry.includes(item.id) ? "selected" : ""}
                aria-label={`${item.label}: ${data.pantry.includes(item.id) ? "pašalinti" : "pridėti"}`}
                aria-pressed={data.pantry.includes(item.id)}
                onClick={() => void toggleIngredient(item.id)}
              >
                <span>{item.emoji}</span>
                {data.pantry.includes(item.id) && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>
        <button
          className="fridge-door"
          aria-label={open ? "Uždaryti šaldytuvą" : "Atidaryti šaldytuvą"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="fridge-logo">f&f</span>
          <span className="freezer-line" />
          <span className="fridge-handle handle-top" />
          <span className="fridge-handle handle-bottom" />
          <span className="fridge-magnet">
            make
            <br />
            <b>something</b>
            <br />
            good. <span>✿</span>
          </span>
          <span className="fridge-sticker">
            FRESH
            <br />
            IDEAS
          </span>
          <span className="door-hint">{open ? "uždaryti ↩" : "spustelk ir atidaryk ↗"}</span>
        </button>
        <span className="fridge-foot foot-left" />
        <span className="fridge-foot foot-right" />
      </div>
      {open && (
        <button className="fridge-close-link" onClick={() => setOpen(false)}>
          Uždaryti šaldytuvą
        </button>
      )}
      <div className="fresh-stamp">
        100%<span>ĮKVĖPIMO</span>
      </div>
    </div>
  );
}

export function IngredientPicker({ all = false }: { all?: boolean }) {
  const { data, toggleIngredient, ready } = useApp();
  return (
    <div className={`ingredient-list ${all ? "all-ingredients" : ""}`}>
      {(all ? ingredients : ingredients.slice(0, 8)).map((item) => {
        const selected = data.pantry.includes(item.id);
        return (
          <button
            key={item.id}
            className={`ingredient-card ${selected ? "selected" : ""}`}
            aria-pressed={selected}
            disabled={!ready}
            onClick={() => void toggleIngredient(item.id)}
          >
            <span className="ingredient-emoji" aria-hidden="true">
              {item.emoji}
            </span>
            <span>{item.label}</span>
            <span className="ingredient-check">
              {selected ? <Check size={12} /> : <Plus size={12} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AIBanner() {
  return (
    <section className="ai-banner">
      <div className="ai-banner-art" aria-hidden="true">
        <span>✳</span>
        <span className="art-bowl">🥣</span>
        <Sparkles size={28} />
      </div>
      <div>
        <div className="eyebrow">MAŽAS PAGALBININKAS. DIDELĖS IDĖJOS.</div>
        <h2>
          Trūksta ingrediento?
          <br />
          <em>Turime sprendimą!</em>
        </h2>
        <p>Keisk ingredientus, atrask naujus skonius ir pritaikyk receptus sau.</p>
      </div>
      <Link href="/ai-asistentas" className="button button-dark">
        Paklausti AI <ArrowUpRight size={18} />
      </Link>
    </section>
  );
}
