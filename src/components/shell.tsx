"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  BookHeart,
  ChevronLeft,
  Compass,
  Heart,
  Menu,
  MessageCircle,
  Search,
  Snowflake,
  Sparkles,
  Utensils,
  Wrench,
  LogOut,
} from "lucide-react";
import { useApp } from "./provider";
import { Dialog } from "./dialog";
import { RecipeDrawer } from "./recipe-drawer";

const links = [
  { href: "/", label: "Atrask receptus", icon: Compass },
  { href: "/mano-virtuve", label: "Mano virtuvė", icon: Snowflake },
  { href: "/mano-receptai", label: "Mano receptai", icon: Heart },
  { href: "/mano-ai-receptai", label: "Mano AI receptai", icon: BookHeart },
  { href: "/ai-asistentas", label: "AI virtuvės asistentas", icon: MessageCircle },
];

function Navigation({ collapsed = false, close }: { collapsed?: boolean; close?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Pagrindinė navigacija">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`nav-link ${pathname === href ? "active" : ""}`}
          title={collapsed ? label : undefined}
          aria-current={pathname === href ? "page" : undefined}
          onClick={close}
        >
          <Icon size={20} />
          <span>{label}</span>
          {href === "/ai-asistentas" && <Sparkles size={14} className="nav-sparkle" />}
        </Link>
      ))}
    </nav>
  );
}

function DeveloperPanel() {
  const { operation } = useApp();
  return (
    <section className="developer-panel" aria-label="Developer Mode">
      <div className="eyebrow">
        <Wrench size={15} /> DEVELOPER MODE
      </div>
      {operation ? (
        <>
          <div className="operation-path">
            {operation.system === "Gemini"
              ? "FridgeFork → Gemini"
              : operation.system === "TheMealDB"
                ? "TheMealDB → FridgeFork"
                : "FridgeFork → Supabase"}
          </div>
          <dl>
            <div>
              <dt>Sistema</dt>
              <dd>{operation.system}</dd>
            </div>
            <div>
              <dt>Endpoint</dt>
              <dd>
                <code>{operation.endpoint}</code>
              </dd>
            </div>
            <div>
              <dt>Metodas</dt>
              <dd>{operation.method}</dd>
            </div>
            <div>
              <dt>HTTP statusas</dt>
              <dd>{operation.status || "Nėra atsakymo"}</dd>
            </div>
            <div>
              <dt>Rezultatas</dt>
              <dd>{operation.ok ? "Pavyko" : "Nepavyko"}</dd>
            </div>
            <div>
              <dt>Trukmė</dt>
              <dd>~{operation.duration} ms</dd>
            </div>
          </dl>
        </>
      ) : (
        <p>Atlikite paiešką ar kitą API operaciją. Čia matysite jos metaduomenis.</p>
      )}
    </section>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { session, developer, setDeveloper, signOut } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("name");
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const recipeId = params.get("receptas");
  function closeRecipe() {
    const next = new URLSearchParams(params.toString());
    next.delete("receptas");
    next.delete("veiksmas");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  return (
    <div className={`app ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#pagrindinis">
        Pereiti į turinį
      </a>
      <header className="header">
        <button
          className="icon-button mobile-menu"
          aria-label="Atidaryti meniu"
          onClick={() => setMobile(true)}
        >
          <Menu />
        </button>
        <Link href="/" className="brand" aria-label="FridgeFork pradžia">
          <span className="brand-mark">
            <Utensils size={23} />
          </span>
          <span>
            fridge<span className="brand-amp">&</span>fork<span className="brand-dot">.</span>
          </span>
        </Link>
        <form
          className="header-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim())
              router.push(`/?q=${encodeURIComponent(query.trim())}&mode=${mode}#receptai`);
          }}
        >
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Ieškoti receptų"
            placeholder={
              mode === "name" ? "Ką šiandien gaminsime?" : "Ingredientas angliškai, pvz. chicken"
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            required
          />
          <label className="sr-only" htmlFor="search-mode">
            Paieškos tipas
          </label>
          <select id="search-mode" value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="name">Pagal pavadinimą</option>
            <option value="ingredient">Pagal ingredientą</option>
          </select>
          <button className="search-submit" aria-label="Ieškoti">
            <ArrowUpRight size={18} />
          </button>
        </form>
        <div className="account-actions">
          {session ? (
            <>
              <span className="user-label">{session.user.email?.split("@")[0]}</span>
              <button className="icon-button" aria-label="Atsijungti" onClick={signOut}>
                <LogOut size={19} />
              </button>
            </>
          ) : (
            <>
              <Link className="login-link" href="/prisijungti">
                Prisijungti
              </Link>
              <Link className="button button-small button-dark" href="/registruotis">
                Registruotis <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </div>
      </header>
      <aside className="sidebar">
        <div className="sidebar-top">
          <span className="eyebrow">TAVO KASDIENĖ VIRTUVĖ</span>
          <button
            className="icon-button collapse-button"
            aria-label={collapsed ? "Išskleisti meniu" : "Suskleisti meniu"}
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <Navigation collapsed={collapsed} />
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>
              Mažiau švaistymo.
              <br />
              Daugiau skonių.
            </span>
            <span className="note-illustration">✳</span>
          </div>
          <button
            className={`developer-toggle ${developer ? "enabled" : ""}`}
            role="switch"
            aria-checked={developer}
            onClick={() => setDeveloper(!developer)}
            title="Developer Mode"
          >
            <Wrench size={17} />
            <span>Developer Mode</span>
            <i />
          </button>
          <span className="sidebar-version">SU MEILE MAISTUI · V.01</span>
        </div>
      </aside>
      {mobile && (
        <Dialog title="Navigacija" close={() => setMobile(false)} className="mobile-navigation">
          <div className="eyebrow">FRIDGE & FORK</div>
          <Navigation close={() => setMobile(false)} />
          <button
            className="button button-outline"
            role="switch"
            aria-checked={developer}
            onClick={() => setDeveloper(!developer)}
          >
            <Wrench size={16} /> Developer Mode {developer ? "įjungtas" : "išjungtas"}
          </button>
        </Dialog>
      )}
      <div className="main-column">
        <main id="pagrindinis" tabIndex={-1}>
          {children}
        </main>
        <footer>
          <Link href="/" className="footer-brand">
            fridge & fork.
          </Link>
          <p>Gaminame kartu — atrandame daugiau skonių!</p>
          <div>
            <a href="https://www.themealdb.com/" target="_blank" rel="noreferrer">
              TheMealDB ↗
            </a>
            <a href="https://supabase.com/" target="_blank" rel="noreferrer">
              Supabase ↗
            </a>
            <a href="https://ai.google.dev/" target="_blank" rel="noreferrer">
              Gemini ↗
            </a>
          </div>
          <span>BAIGIAMASIS PROJEKTAS · 2026</span>
        </footer>
      </div>
      {developer && <DeveloperPanel />}
      {recipeId && <RecipeDrawer key={recipeId} id={recipeId} close={closeRecipe} />}
    </div>
  );
}
