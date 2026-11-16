"use client";

import { lithuanianValidation } from "@/lib/form-validation";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChefHat,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useApp } from "./provider";
import { AccountGate } from "./collections";
import { api } from "@/lib/telemetry";
import { ingredientLabel } from "@/lib/ingredients";
import type { Conversation, Message } from "@/lib/types";

const suggestions = [
  "Ką pagaminti iš mano produktų?",
  "Kuo pakeisti kiaušinius kepiniuose?",
  "Pasiūlyk greitą vakarienę dviem",
];

export function AssistantPage() {
  const { data, session, patchData, notice, requireAuth } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [includePantry, setIncludePantry] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Conversation | null>(null);
  const [pending, setPending] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const accountVersion = useRef(0);
  const active = draft ?? data.conversations.find((item) => item.id === selected);
  useEffect(() => {
    accountVersion.current++;
    setSelected(null);
    setDraft(null);
    setInput("");
    setPending("");
    setError("");
    setBusy(false);
  }, [session?.user.id]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active?.messages.length, pending, busy]);

  async function persist(conversation: Conversation) {
    if (
      await patchData("conversations", (current) => [
        conversation,
        ...current.filter((item) => item.id !== conversation.id),
      ])
    ) {
      setDraft(null);
      return true;
    }
    return false;
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim() || !requireAuth() || !session || busy || draft) return;
    const version = accountVersion.current;
    const text = input.trim();
    const messages: Message[] = [...(active?.messages ?? []), { role: "user", text }];
    if (messages.length > 29) {
      setError("Šis pokalbis jau ilgas. Pradėk naują pokalbį.");
      return;
    }
    setPending(text);
    setBusy(true);
    setError("");
    try {
      const response = await api<{ text: string }>("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages,
          context: includePantry
            ? `Turimi produktai: ${data.pantry.map(ingredientLabel).join(", ") || "nenurodyti"}`
            : "",
        }),
      });
      if (version !== accountVersion.current) return;
      const updated: Conversation = {
        id: active?.id ?? crypto.randomUUID(),
        title: active?.title ?? text.slice(0, 60),
        messages: [...messages, { role: "model", text: response.text }],
        createdAt: active?.createdAt ?? new Date().toISOString(),
      };
      setDraft(updated);
      setSelected(updated.id);
      setInput("");
      await persist(updated);
    } catch (error) {
      if (version === accountVersion.current) setError((error as Error).message);
    } finally {
      if (version === accountVersion.current) {
        setPending("");
        setBusy(false);
      }
    }
  }
  function startNew() {
    setSelected(null);
    setDraft(null);
    setError("");
    setInput("");
  }
  return (
    <div className="interior-page assistant-page">
      <div className="page-intro">
        <div className="eyebrow">
          <Sparkles size={14} /> DAUGIAU KŪRYBOS. MAŽIAU „KĄ GAMINTI?“
        </div>
        <h1>
          AI virtuvės <em>asistentas</em>
          <span className="orange-dot">.</span>
        </h1>
        <p>Mažas pagalbininkas dideliems ir kasdieniams kulinariniams klausimams.</p>
      </div>
      <AccountGate>
        <div className="chat-layout">
          <aside className="chat-history">
            <button
              className="button button-outline"
              onClick={startNew}
              disabled={busy || !!draft || saving}
            >
              <Plus size={17} /> Naujas pokalbis
            </button>
            <div className="eyebrow">TAVO POKALBIAI</div>
            {!data.conversations.length && (
              <p className="subtle">Pirmas skanus pokalbis dar priešakyje.</p>
            )}
            {data.conversations.map((item) => (
              <div className={`history-item ${selected === item.id ? "active" : ""}`} key={item.id}>
                <button
                  disabled={busy || !!draft || saving}
                  onClick={() => {
                    setSelected(item.id);
                    setError("");
                  }}
                >
                  <MessageCircle size={15} />
                  <span>{item.title}</span>
                </button>
                <button
                  disabled={busy || !!draft || saving}
                  className="delete-chat"
                  aria-label={`Ištrinti pokalbį ${item.title}`}
                  onClick={async () => {
                    setSaving(true);
                    const ok = await patchData("conversations", (current) =>
                      current.filter((conversation) => conversation.id !== item.id),
                    );
                    if (ok && selected === item.id) startNew();
                    setSaving(false);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </aside>
          <section className="chat-main" aria-label="Pokalbis su AI">
            <div className="chat-topbar">
              <span className="assistant-avatar">
                <ChefHat size={22} />
              </span>
              <div>
                <strong>Tavo virtuvės pagalbininkas</strong>
                <span>Įkvėpimas su Gemini</span>
              </div>
              <span className="ai-label">AI</span>
            </div>
            <div className="chat-messages" aria-live="polite">
              {!active?.messages.length && !busy && (
                <div className="chat-welcome">
                  <span className="welcome-spark">✳</span>
                  <h2>
                    Kas šiandien <em>ant stalo?</em>
                  </h2>
                  <p>Paklausk apie ingredientus, receptų pakeitimus ar naujas vakarienės idėjas.</p>
                  <div className="chat-suggestions">
                    {suggestions.map((text) => (
                      <button key={text} onClick={() => setInput(text)}>
                        {text}
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {active?.messages.map((message, index) => (
                <div className={`chat-message ${message.role}`} key={`${active.id}-${index}`}>
                  <span className="message-author">
                    {message.role === "user" ? "Tu" : "FridgeFork AI"}
                  </span>
                  <div className="preserve-lines">{message.text}</div>
                </div>
              ))}
              {pending && (
                <div className="chat-message user">
                  <span className="message-author">Tu</span>
                  <div>{pending}</div>
                </div>
              )}
              {busy && (
                <div className="chat-thinking" role="status">
                  <Sparkles size={16} /> Maišome idėjas…
                </div>
              )}
              <div ref={end} />
            </div>
            {draft && !busy && (
              <div className="unsaved-chat" role="status">
                <span>Atsakymas dar neišsaugotas paskyroje.</span>
                <button
                  className="text-button"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    if (await persist(draft)) notice("Pokalbis išsaugotas.");
                    setSaving(false);
                  }}
                >
                  <Check size={16} /> Bandyti išsaugoti
                </button>
              </div>
            )}
            {error && (
              <div className="form-error chat-error" role="alert">
                {error}
              </div>
            )}
            <form className="chat-form" onSubmit={send}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includePantry}
                  onChange={(event) => setIncludePantry(event.target.checked)}
                  disabled={busy}
                />{" "}
                Pridėti „Mano virtuvės“ produktus ({data.pantry.length})
              </label>
              <div className="chat-input-row">
                <label className="sr-only" htmlFor="chat-input">
                  Žinutė AI asistentui
                </label>
                <textarea
                  id="chat-input"
                  required
                  {...lithuanianValidation}
                  maxLength={4000}
                  placeholder="Kuo šiandien galiu padėti?"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={busy || !!draft}
                />
                <button
                  className="button button-primary"
                  disabled={busy || !!draft || !input.trim()}
                  aria-label="Siųsti žinutę"
                >
                  <Send size={20} />
                </button>
              </div>
              <span className="chat-disclaimer">
                AI gali klysti. Patikrink ingredientus ir gaminimo rekomendacijas.
              </span>
            </form>
          </section>
        </div>
      </AccountGate>
    </div>
  );
}
