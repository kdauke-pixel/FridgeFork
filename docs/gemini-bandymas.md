# Gemini patikrinimas atskirai (11 užduotis)

Šis bandymas išsiunčia vieną klausimą tiesiai į Gemini. Jis neliečia receptų ar Supabase ir nereikalauja paleisti svetainės.

1. `.env.local` faile išsaugokite `GEMINI_API_KEY=...` su tikruoju raktu. Rakto niekam nesiųskite.
2. VS Code pasirinkite **Terminal → New Terminal**. Terminalas – vieta komandoms įrašyti. Jame turi būti atidarytas `FridgeFork` aplankas.
3. Jei ką tik parsisiuntėte projekto pakeitimus, paleiskite `npm.cmd ci`. Tai įdiegia projekte nurodytas bibliotekas, įskaitant oficialią `@google/genai` biblioteką. Reikia Node.js 22 arba naujesnio.
4. Paleiskite:

   ```powershell
   npm.cmd run test:gemini
   ```

5. Terminale pamatysite klausimą, Gemini atsakymą apie picą ir tekstą „Pavyko! Gemini ryšys veikia.“ Tik tada bandymas laikomas sėkmingu.

`scripts/test-gemini.mjs` vykdomas jūsų kompiuteryje per Node.js, ne naršyklėje. Jis perskaito `.env.local`, naudoja oficialų SDK ir išsiunčia vieną užklausą. Raktas neišvedamas į terminalą. Bandymui naudojamas `gemini-3.5-flash-lite`, kuriam Google kainoraštyje nurodyta nemokama tekstinių užklausų pakopa su limitais. Bandymas nepriklauso nuo programos `GEMINI_MODEL` nustatymo.

Jei nepavyksta:

- Pranešimas apie trūkstamą raktą: patikrinkite pavadinimą `GEMINI_API_KEY`, reikšmę ir ar išsaugojote `.env.local`.
- HTTP 400 / 401 / 403: patikrinkite raktą ir jo leidimus Google AI Studio.
- HTTP 404: modelis neprieinamas jūsų projektui; reikia pasirinkti prieinamą modelį.
- HTTP 429: pasiektas limitas arba nesuteikta kvota. Patikrinkite projekto Free Tier ir limitus Google AI Studio. Naujas raktas tame pačiame projekte kvotos nepadidina.
- Ryšio klaida: patikrinkite internetą ir bandykite vėliau.

Po `.env.local` pakeitimo šią komandą paleiskite dar kartą: kiekvienas bandymas failą perskaito iš naujo. Kai vėliau naudosite Gemini svetainėje, po nustatymų pakeitimo reikės iš naujo paleisti `npm.cmd run dev`.

Oficialūs šaltiniai: [SDK](https://googleapis.github.io/js-genai/release_docs/), [modelių kainos ir nemokama pakopa](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite).
