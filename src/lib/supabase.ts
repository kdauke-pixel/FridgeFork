import { createClient } from "@supabase/supabase-js";
import { report } from "./telemetry";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only allowlisted route names reach the diagnostics panel. No query, body or headers.
export function safeSupabaseEndpoint(input: string) {
  const path = new URL(input).pathname;
  if (path === "/rest/v1/account_data") return "/rest/v1/account_data";
  if (path === "/rest/v1/favorites") return "/rest/v1/favorites";
  const routes = ["token", "signup", "logout", "recover", "user", "verify"];
  return (
    routes.map((route) => `/auth/v1/${route}`).find((route) => path === route) ?? "/auth/v1/session"
  );
}

export const supabase =
  url && key
    ? createClient(url, key, {
        global: {
          fetch: async (input, init) => {
            const started = performance.now();
            const endpoint = safeSupabaseEndpoint(
              typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
            );
            const method = init?.method ?? "GET";
            try {
              const response = await fetch(input, init);
              report({
                system: "Supabase",
                endpoint,
                method,
                status: response.status,
                ok: response.ok,
                duration: Math.round(performance.now() - started),
              });
              return response;
            } catch (error) {
              report({
                system: "Supabase",
                endpoint,
                method,
                status: 0,
                ok: false,
                duration: Math.round(performance.now() - started),
              });
              throw error;
            }
          },
        },
      })
    : null;
