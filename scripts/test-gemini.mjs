import { loadEnvFile } from "node:process";
import { GoogleGenAI } from "@google/genai";

// Šis failas paleidžiamas tik per Node.js, todėl raktas nepatenka į naršyklę.
try {
  loadEnvFile(".env.local");
} catch {
  console.error("Nepavyko perskaityti .env.local. Paleiskite komandą iš FridgeFork aplanko.");
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.error(".env.local faile trūksta GEMINI_API_KEY. Įrašykite raktą ir išsaugokite failą.");
  process.exit(1);
}

// Atskiras bandymo modelis, nepriklausantis nuo receptų ar programos nustatymų.
const model = "gemini-3.5-flash-lite";
const prompt = "Parašyk vieną sakinį apie picą lietuviškai.";
const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 30_000 } });

console.log(`Modelis: ${model}`);
console.log(`Klausimas: ${prompt}`);

try {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { maxOutputTokens: 256 },
  });
  const answer = response.text?.trim();
  if (!answer) {
    console.error("Gemini grąžino tuščią atsakymą. Bandymas nepatvirtintas.");
    process.exitCode = 1;
  } else {
    console.log(`Atsakymas: ${answer.replaceAll(apiKey, "[paslėptas raktas]")}`);
    console.log("Pavyko! Gemini ryšys veikia.");
  }
} catch (error) {
  // Nerodome viso klaidos objekto: jame gali būti slapta užklausos informacija.
  const status = Number(error?.status);
  const hints = {
    400: "Patikrinkite, ar GEMINI_API_KEY įrašytas tikras ir visas API raktas.",
    401: "API raktas neatpažintas. Patikrinkite jį Google AI Studio.",
    403: "Prieiga neleidžiama. Patikrinkite rakto leidimus ir projekto prieigą Google AI Studio.",
    404: "Bandymo modelis neprieinamas. Reikia patikrinti jūsų projektui prieinamus modelius.",
    429: "Pasiektas užklausų limitas arba projektui nėra kvotos. Patikrinkite Free Tier ir limitus Google AI Studio.",
  };
  console.error(`Gemini bandymas nepavyko${Number.isFinite(status) ? ` (HTTP ${status})` : ""}.`);
  console.error(
    hints[status] ||
      "Patikrinkite interneto ryšį ir Gemini paslaugos prieinamumą; užklausa taip pat galėjo viršyti 30 s laukimo laiką.",
  );
  process.exitCode = 1;
}
