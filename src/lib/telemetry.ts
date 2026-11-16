import type { Operation } from "./types";

export function report(operation: Operation) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("fridgefork:operation", { detail: operation }));
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (body.operations) for (const operation of body.operations) report(operation);
  if (!response.ok)
    throw new Error(body.error ?? "Nepavyko atlikti operacijos. Bandykite dar kartą.");
  return body as T;
}
