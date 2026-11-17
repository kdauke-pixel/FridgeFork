import { GoogleGenAI } from "@google/genai";

// Runs only in Node.js; the key is never sent to the browser or printed.
const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  console.error("Įrašykite GEMINI_API_KEY į .env.local ir pakartokite testą.");
  process.exitCode = 1;
} else {
  const ai = new GoogleGenAI({ apiKey, apiVersion: "v1beta", httpOptions: { timeout: 30000 } });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: "Parašyk vieną sakinį apie picą.",
      config: { maxOutputTokens: 256 },
    });
    const text = response.text?.trim();
    if (!text) throw new Error("EMPTY_RESPONSE");
    console.log(text);
  } catch (error) {
    // Avoid printing SDK errors that could include request details or credentials.
    const status = typeof error?.status === "number" ? error.status : null;
    console.error(
      status === 429
        ? "Gemini kvota išnaudota arba užklausų limitas viršytas (429). Patikrinkite Google AI Studio limitus."
        : status === 400 || status === 401 || status === 403
          ? `Gemini atmetė užklausą (${status}). Patikrinkite API raktą ir projekto prieigą.`
          : status === 404
            ? "Modelis gemini-3.5-flash-lite nepasiekiamas šiame projekte (404)."
            : "Gemini testo atlikti nepavyko: negautas atsakymas arba nutrūko ryšys.",
    );
    process.exitCode = 1;
  }
}
