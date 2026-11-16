"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AccountData, Operation } from "@/lib/types";
import { safeReturnPath } from "@/lib/routing";

const emptyData = (): AccountData => ({
  pantry: [],
  favorites: {},
  adaptations: [],
  conversations: [],
});
const guestKey = "fridgefork:guest-pantry";
function readGuest(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(guestKey) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string").slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

type AppContext = {
  data: AccountData;
  session: Session | null;
  ready: boolean;
  operation: Operation | null;
  developer: boolean;
  setDeveloper: (value: boolean) => void;
  notice: (message: string) => void;
  patchData: <K extends keyof AccountData>(
    key: K,
    value: AccountData[K] | ((current: AccountData[K]) => AccountData[K]),
  ) => Promise<boolean>;
  toggleIngredient: (id: string) => Promise<void>;
  requireAuth: (returnPath?: string) => boolean;
  signOut: () => Promise<void>;
};
const Context = createContext<AppContext | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing FridgeFork provider");
  return value;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AccountData>(emptyData);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [developer, setDeveloper] = useState(false);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [toast, setToast] = useState("");
  const generation = useRef(0);
  const currentUser = useRef<string | null | undefined>(undefined);
  const dataRef = useRef(data);
  const saveQueues = useRef<Partial<Record<keyof AccountData, Promise<boolean>>>>({});
  const router = useRouter();
  const pathname = usePathname();
  const notice = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    const handler = (event: Event) => setOperation((event as CustomEvent<Operation>).detail);
    window.addEventListener("fridgefork:operation", handler);
    return () => window.removeEventListener("fridgefork:operation", handler);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    let disposed = false;
    async function sync(nextSession: Session | null) {
      if (disposed) return;
      setSession(nextSession);
      const id = nextSession?.user.id ?? null;
      if (currentUser.current === id) return;
      currentUser.current = id;
      const version = ++generation.current;
      setReady(false);
      const blank = emptyData();
      blank.pantry = readGuest();
      dataRef.current = blank;
      setData(blank);
      if (!id || !supabase) {
        setReady(true);
        return;
      }
      const { data: row, error } = await supabase
        .from("account_data")
        .select("pantry,favorites,adaptations,conversations")
        .eq("user_id", id)
        .maybeSingle();
      if (disposed || version !== generation.current) return;
      if (error) {
        notice("Nepavyko įkelti paskyros duomenų. Perkraukite puslapį ir bandykite dar kartą.");
        return;
      }
      const loaded: AccountData = row ? { ...emptyData(), ...row } : emptyData();
      const guest = readGuest();
      loaded.pantry = [...new Set([...loaded.pantry, ...guest])].slice(0, 12);
      if (guest.length || !row) {
        const { error: saveError } = await supabase
          .from("account_data")
          .upsert({ user_id: id, pantry: loaded.pantry }, { onConflict: "user_id" });
        if (disposed || version !== generation.current) return;
        if (saveError) {
          notice("Produktų perkelti į paskyrą nepavyko. Jie liko šiame įrenginyje.");
          return;
        }
        try {
          localStorage.removeItem(guestKey);
        } catch {
          /* Storage may be disabled. */
        }
      }
      dataRef.current = loaded;
      setData(loaded);
      setReady(true);
    }
    if (!supabase) {
      void sync(null);
      return () => {
        disposed = true;
        currentUser.current = undefined;
      };
    }
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") router.replace("/naujas-slaptazodis");
      // Run database calls outside the auth callback's lock.
      setTimeout(() => {
        void sync(nextSession);
      }, 0);
    });
    return () => {
      disposed = true;
      currentUser.current = undefined;
      listener.subscription.unsubscribe();
    };
  }, [notice, router]);

  async function patchData<K extends keyof AccountData>(
    key: K,
    update: AccountData[K] | ((current: AccountData[K]) => AccountData[K]),
  ): Promise<boolean> {
    if (!ready) {
      notice("Paskyros duomenys dar nepasiekiami. Palaukite arba perkraukite puslapį.");
      return false;
    }
    const version = generation.current;
    const task = (saveQueues.current[key] ?? Promise.resolve(true))
      .then(async () => {
        if (version !== generation.current) return false;
        const value = typeof update === "function" ? update(dataRef.current[key]) : update;
        if (session && supabase) {
          const { error } = await supabase
            .from("account_data")
            .upsert({ user_id: session.user.id, [key]: value }, { onConflict: "user_id" });
          if (version !== generation.current) return false;
          if (error) {
            notice("Pakeitimų išsaugoti nepavyko. Bandykite dar kartą.");
            return false;
          }
        } else if (key === "pantry") {
          try {
            localStorage.setItem(guestKey, JSON.stringify(value));
          } catch {
            notice("Naršyklė neleidžia išsaugoti produktų. Sąrašas galios iki puslapio uždarymo.");
          }
        } else return false;
        dataRef.current = { ...dataRef.current, [key]: value };
        setData(dataRef.current);
        return true;
      })
      .catch(() => {
        notice("Pakeitimų išsaugoti nepavyko. Bandykite dar kartą.");
        return false;
      });
    saveQueues.current[key] = task;
    return task;
  }
  async function toggleIngredient(id: string) {
    await patchData("pantry", (pantry) => {
      if (!pantry.includes(id) && pantry.length >= 12) {
        notice("Vienu metu galima pasirinkti iki 12 produktų.");
        return pantry;
      }
      return pantry.includes(id) ? pantry.filter((item) => item !== id) : [...pantry, id];
    });
  }
  function requireAuth(returnPath?: string) {
    if (session) return true;
    const next = safeReturnPath(returnPath ?? `${pathname}${window.location.search}`);
    router.push(`/prisijungti?next=${encodeURIComponent(next)}`);
    return false;
  }
  async function signOut() {
    const { error } = await supabase!.auth.signOut();
    if (error) notice("Atsijungti nepavyko. Bandykite dar kartą.");
    else router.push("/");
  }
  return (
    <Context.Provider
      value={{
        data,
        session,
        ready,
        operation,
        developer,
        setDeveloper,
        notice,
        patchData,
        toggleIngredient,
        requireAuth,
        signOut,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button aria-label="Uždaryti pranešimą" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
