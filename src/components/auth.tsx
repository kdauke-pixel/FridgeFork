"use client";

import { lithuanianValidation } from "@/lib/form-validation";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { safeReturnPath } from "@/lib/routing";
import { useApp } from "./provider";

type AuthMode = "prisijungti" | "registruotis" | "atkurti-slaptazodi" | "naujas-slaptazodis";
const copy: Record<
  AuthMode,
  { title: string; accent: string; description: string; button: string }
> = {
  prisijungti: {
    title: "Smagu tave",
    accent: "matyti.",
    description: "Tavo receptai ir naujos idėjos jau laukia.",
    button: "Prisijungti",
  },
  registruotis: {
    title: "Vieta tavo",
    accent: "skoniams.",
    description: "Susikurk paskyrą ir pradėk savo receptų kolekciją.",
    button: "Sukurti paskyrą",
  },
  "atkurti-slaptazodi": {
    title: "Sugrįžk į",
    accent: "virtuvę.",
    description: "Atsiųsime nuorodą naujam slaptažodžiui nustatyti.",
    button: "Siųsti atkūrimo nuorodą",
  },
  "naujas-slaptazodis": {
    title: "Nauja",
    accent: "pradžia.",
    description: "Nustatyk naują savo paskyros slaptažodį.",
    button: "Išsaugoti slaptažodį",
  },
};

function authMessage(message: string) {
  if (/invalid login/i.test(message)) return "Neteisingas el. paštas arba slaptažodis.";
  if (/email not confirmed/i.test(message))
    return "Pirmiausia patvirtink el. paštą per gautą nuorodą.";
  if (/already registered/i.test(message))
    return "Šis el. paštas jau užregistruotas. Pabandyk prisijungti.";
  if (/rate limit|too many|seconds/i.test(message))
    return "Per daug bandymų. Šiek tiek palauk ir bandyk dar kartą.";
  if (/password/i.test(message))
    return "Slaptažodis neatitinka reikalavimų arba sutampa su ankstesniu.";
  return "Operacijos atlikti nepavyko. Patikrink duomenis ir bandyk dar kartą.";
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { session, notice } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeReturnPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const text = copy[mode];
  const reset = mode === "atkurti-slaptazodi";
  const newPassword = mode === "naujas-slaptazodis";
  const registration = mode === "registruotis";
  useEffect(() => {
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmation("");
  }, [mode]);
  useEffect(() => {
    if (session && (mode === "prisijungti" || mode === "registruotis")) router.replace(next);
  }, [session, mode, next, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setError("");
    setSuccess("");
    if ((registration || newPassword) && password !== confirmation) {
      setError("Slaptažodžiai nesutampa.");
      return;
    }
    if (newPassword && !session) {
      setError("Atkūrimo nuoroda negalioja arba pasibaigė. Paprašyk naujos nuorodos.");
      return;
    }
    setBusy(true);
    try {
      if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/naujas-slaptazodis`,
        });
        if (error) throw error;
        setSuccess(
          "Jei paskyra šiuo el. paštu egzistuoja, netrukus gausi slaptažodžio atkūrimo nuorodą.",
        );
      } else if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        notice("Slaptažodis atnaujintas.");
        router.replace("/");
      } else if (registration) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/prisijungti?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        if (data.session) router.replace(next);
        else
          setSuccess(
            "Patikrink savo el. paštą ir patvirtink registraciją. Tuomet galėsi prisijungti.",
          );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
      }
    } catch (error) {
      setError(authMessage((error as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-visual">
        <img
          src="https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg"
          alt="Šviežiai paruoštas patiekalas su žalumynais"
        />
        <div className="auth-visual-overlay">
          <div className="eyebrow">GAMINIMAS YRA MAŽAS KASDIENIS DŽIAUGSMAS</div>
          <h2>
            Geras maistas.
            <br />
            <em>Dar geresnės idėjos.</em>
          </h2>
          <p>Tavo virtuvėje slypi daugiau, nei manai.</p>
        </div>
        <span className="auth-stamp">
          a pinch
          <br />
          of joy ✳
        </span>
      </section>
      <section className="auth-form-panel">
        <div className="eyebrow">SVEIKAS ATVYKĘS Į FRIDGE & FORK</div>
        <h1>
          {text.title}
          <br />
          <em>{text.accent}</em>
        </h1>
        <p>{text.description}</p>
        {!supabase && (
          <div className="inline-info" role="status">
            Paskyros funkcijos dar ruošiamos. Kol kas gali atrasti receptus ir susidėti produktus
            „Mano virtuvėje“.
          </div>
        )}
        {success ? (
          <div className="auth-success" role="status">
            <CheckCircle2 size={32} />
            <p>{success}</p>
            <Link
              href={`/prisijungti?next=${encodeURIComponent(next)}`}
              className="button button-outline"
            >
              Į prisijungimą <ArrowUpRight size={16} />
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            {!newPassword && (
              <>
                <label htmlFor="email">El. paštas</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tavo@pastas.lt"
                  required
                  {...lithuanianValidation}
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={busy || !supabase}
                />
              </>
            )}
            {!reset && (
              <>
                <label htmlFor="password">
                  {newPassword ? "Naujas slaptažodis" : "Slaptažodis"}
                </label>
                <div className="password-input">
                  <input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete={registration || newPassword ? "new-password" : "current-password"}
                    minLength={8}
                    maxLength={128}
                    placeholder="Bent 8 simboliai"
                    required
                    {...lithuanianValidation}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={busy || !supabase}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={show ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {(registration || newPassword) && (
                  <>
                    <label htmlFor="confirm-password">Pakartok slaptažodį</label>
                    <input
                      id="confirm-password"
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      {...lithuanianValidation}
                      minLength={8}
                      maxLength={128}
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      disabled={busy || !supabase}
                    />
                  </>
                )}
                {mode === "prisijungti" && (
                  <Link className="forgot-link" href="/atkurti-slaptazodi">
                    Pamiršai slaptažodį?
                  </Link>
                )}
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button button-primary auth-submit" disabled={busy || !supabase}>
              {busy ? "Palauk akimirką…" : text.button}
              <ArrowUpRight size={18} />
            </button>
          </form>
        )}
        <div className="auth-switch">
          {registration ? (
            <>
              Jau turi paskyrą?{" "}
              <Link href={`/prisijungti?next=${encodeURIComponent(next)}`}>Prisijunk</Link>
            </>
          ) : mode === "prisijungti" ? (
            <>
              Dar neturi paskyros?{" "}
              <Link href={`/registruotis?next=${encodeURIComponent(next)}`}>Registruokis</Link>
            </>
          ) : (
            <Link href="/prisijungti">Grįžti į prisijungimą</Link>
          )}
        </div>
        <div className="auth-footer-note">Mažiau švaistymo. Daugiau bendrų vakarienių.</div>
      </section>
    </div>
  );
}
