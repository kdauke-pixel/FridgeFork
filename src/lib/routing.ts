export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return "/";
  try {
    const url = new URL(value, "https://fridgefork.local");
    if (
      url.origin !== "https://fridgefork.local" ||
      /^\/(prisijungti|registruotis|naujas-slaptazodis|atkurti-slaptazodi)(\/|$)/.test(url.pathname)
    )
      return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function recipeActionPath(path: string, id: string, action: "save" | "adapt") {
  const url = new URL(safeReturnPath(path), "https://fridgefork.local");
  url.searchParams.set("receptas", id);
  url.searchParams.set("veiksmas", action);
  return `${url.pathname}${url.search}`;
}
