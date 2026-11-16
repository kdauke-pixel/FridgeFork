"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { Favorite } from "@/lib/types";
import { useApp } from "./provider";

export function RecipeNotes({ id, favorite }: { id: string; favorite: Favorite }) {
  const { saveNote, ready } = useApp();
  const [note, setNote] = useState(favorite.note ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const storedNote = favorite.note ?? "";
  const dirty = note !== storedNote;

  useEffect(() => {
    setNote(storedNote);
  }, [storedNote]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || status === "saving" || !ready) return;
    setStatus("saving");
    const ok = await saveNote(id, note);
    setStatus(ok ? "saved" : "error");
  }

  return (
    <section className="notes-section">
      <h3>Mano pastabos</h3>
      <form onSubmit={save}>
        <label htmlFor="recipe-note">Asmeninė pastaba</label>
        <textarea
          id="recipe-note"
          maxLength={3000}
          value={note}
          disabled={status === "saving" || !ready}
          aria-describedby="recipe-note-status"
          onChange={(event) => {
            setNote(event.target.value);
            setStatus("idle");
          }}
          placeholder="Ką kitą kartą darytum kitaip?"
        />
        <button
          className="button button-outline"
          disabled={status === "saving" || !ready || !dirty}
        >
          {status === "saving" ? (
            "Išsaugoma…"
          ) : status === "saved" && !dirty ? (
            <>
              <Check size={16} /> Išsaugota
            </>
          ) : (
            "Išsaugoti pastabą"
          )}
        </button>
        <div
          id="recipe-note-status"
          className={`note-status ${status === "error" ? "note-status-error" : ""}`}
          role={status === "error" ? "alert" : "status"}
        >
          {status === "saving"
            ? "Pastaba išsaugoma…"
            : status === "error"
              ? "Pastabos išsaugoti nepavyko. Tekstas liko laukelyje — bandyk dar kartą."
              : dirty
                ? "Yra neišsaugotų pakeitimų."
                : status === "saved" || storedNote
                  ? "Pastaba išsaugota tavo paskyroje."
                  : ""}
        </div>
      </form>
    </section>
  );
}
