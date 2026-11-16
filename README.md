# FridgeFork

Lietuviška receptų aplikacija su Next.js App Router, TypeScript, TheMealDB, Supabase ir Gemini. Dizainas: „Food Editorial“, Fraunces / DM Sans ir kreminė–oranžinė–žalia paletė.

## Paleidimas

Reikia Node.js 20.9 arba naujesnio ir npm. PowerShell aplinkoje, jei `npm.ps1` blokuojamas, naudokite `npm.cmd`.

```powershell
npm.cmd ci
npm.cmd run dev
```

Atidarykite http://localhost:3000. Receptų paieška ir svečio virtuvė veikia be paslaugų raktų. Reikia interneto TheMealDB nuotraukoms, receptams ir Google Fonts šriftams.

## Supabase ir Gemini paruošimas

1. Nukopijuokite `.env.example` į `.env.local` ir užpildykite Supabase projekto URL bei viešą anon raktą. Nenaudokite `service_role` rakto.
2. Naujame Supabase projekte SQL Editor paleiskite `supabase/schema.sql`, tada `supabase/migrations/20261116_favorites.sql`. Jau veikiančiame projekte paleiskite tik migracijos failą. RLS leidžia vartotojui skaityti ir keisti tik savo duomenis. Žr. [perkėlimo instrukciją](docs/favorites-perkelimas.md).
3. Supabase Authentication įjunkite Email / Password ir el. pašto patvirtinimą. Nustatykite Site URL `http://localhost:3000`, o Redirect URLs pridėkite `http://localhost:3000/**`. Publikuojant pridėkite savo domeną ir jo grįžimo URL.
4. Pridėkite Gemini raktą į `GEMINI_API_KEY`. `GEMINI_MODEL` galima pakeisti į jūsų projektui prieinamą modelį.
5. Po aplinkos kintamųjų keitimo iš naujo paleiskite Next.js.

`GEMINI_API_KEY` naudojamas tik serverio `/api/ai` maršrute. Vieši `NEXT_PUBLIC_SUPABASE_*` kintamieji skirti naršyklės klientui; duomenis saugo RLS. Nei `.env.local`, nei priklausomybės nėra įtraukiami į Git.

Be konfigūracijos paskyros formos aiškiai rodo nepasiekiamumo būseną; paskyros ir AI funkcijos nėra imituojamos. Tikras paskyros, RLS, el. pašto ir Gemini veikimas turi būti patikrintas prijungus jūsų paslaugas.

## Puslapiai ir elgsena

- `/` — paieška pagal anglišką recepto pavadinimą arba ingredientą, kategorijos, ingredientų pasirinkimas, receptų katalogas.
- `/mano-virtuve` — atidaromas šaldytuvas ir bendras produktų sąrašas. Svečio duomenys lieka `localStorage`; prisijungus sujungiami su paskyros produktais (iki 12).
- `/mano-receptai` — išsaugoti receptai, kategorijų filtrai ir pastabos recepto peržiūroje.
- `/mano-ai-receptai` — išsaugotos adaptacijos su pradiniu receptu, prašymu ir AI rezultatu.
- `/ai-asistentas` — paskyroje išsaugomi pokalbiai su Gemini ir pasirinktinis virtuvės produktų kontekstas.
- `/prisijungti`, `/registruotis`, `/atkurti-slaptazodi`, `/naujas-slaptazodis` — Supabase paskyros formos.

Bet kuriame puslapyje `?receptas=52772` atidaro recepto skydelį. Naudojamas natyvus modalinis `dialog`: fokusas laikomas skydelyje, Escape uždaro, uždarius grąžinamas ankstesnis fokusas. Navigacija ir animacijos prisitaiko prie ekrano bei `prefers-reduced-motion`.

Svečio pradėtas išsaugojimas arba AI pritaikymas perduodamas per saugų grįžimo URL. Po prisijungimo atidaromas tas pats receptas ir tęsiamas pradėtas veiksmas. Paskyros pakeitimai tame pačiame įrenginyje įrašomi eilės tvarka; pasikeitus vartotojui ankstesnio AI užklausos atsakymas neberodomas.

Kategorijų juosta remiasi tikromis TheMealDB kategorijomis; „pietūs“ ir „vakarienė“ nėra pateikiami kaip išgalvoti API filtrai. Ingredientų LT pavadinimai susieti su TheMealDB EN reikšmėmis. Kelių produktų paieška sujungia nemokamas vieno ingrediento užklausas, skaičiuoja atitikimus ir pirmiau rodo daugiau atitikimų turinčius receptus. Nepavykus vienai užklausai, pateikiama klaida, o ne nepilnas reitingas.

## Duomenų srautai

- **Naršyklė:** komponentai, paieškos URL, svečio produktai, Supabase Auth ir asmeniniai duomenys su RLS.
- **Next.js `/api/meals`:** ribotos, patikrintos TheMealDB užklausos; atsakymai normalizuojami ir rūšiuojami, išorinėms užklausoms taikomas laiko limitas.
- **Next.js `/api/ai`:** tikrina Supabase vartotojo access token ir perduoda ribotą pokalbį bei kontekstą Gemini. Raktas niekada negrąžinamas į naršyklę.
- **Supabase `account_data`:** `pantry`, `adaptations`, `conversations` JSONB laukai vienam vartotojui. Sena `favorites` JSON reikšmė lieka tik kaip istorinis perkėlimo šaltinis.
- **Supabase `favorites`:** po vieną vartotojo receptą eilutėje; atskiri `user_id`, `recipe_id`, `recipe_name`, `image_url`, `recipe_data`, `note`, `created_at` stulpeliai. Pastabos keitimas atnaujina tik konkrečios eilutės `note`. RLS ir unikali vartotojo / recepto pora užtikrina atskiras kolekcijas be dublikatų.
- **Developer Mode:** jungiklis rodo paskutinės operacijos sistemą, saugų kelią, metodą, HTTP kodą, sėkmę ir apytikslę trukmę. Query parametrai, užklausų turinys, vartotojų ID, slaptažodžiai ir raktai į skydelį nepatenka. Tinklo klaidos be HTTP atsakymo žymimos „Nėra atsakymo“.

## Patikrinimas

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run start
```

Testai tikrina receptų normalizavimą, kelių ingredientų reitingą, klaidų ir tuščių rezultatų apdorojimą, grįžimo URL saugumą ir diagnostikos duomenų valymą.

Rankiniu būdu naršyklėje patikrinkite 390 / 768 / 1440 px išdėstymus, šaldytuvo atidarymą ir pasirinkimų bendrumą, perkrovus išlikusius svečio produktus, paiešką, tiesioginę recepto nuorodą, Tab / Shift+Tab / Escape, sumažinto judesio režimą ir Developer Mode. Su tikrais raktais papildomai patikrinkite registraciją / patvirtinimą / slaptažodžio atkūrimą, dviejų paskyrų duomenų atskyrimą, mėgstamų receptų pastabas, AI adaptacijos išsaugojimą ir pokalbių atkūrimą po prisijungimo.

## Darbas poroje

Šis etapas paruošia vietinį projektą; GitHub ir Vercel publikavimas atliekami atskirame žingsnyje. Partneris A sukuria saugyklą ir pakviečia partnerį B. Partneris B klonuoja, paleidžia `npm.cmd ci` ir susikuria savo `.env.local`. Dirbkite po vieną sutartą funkciją, naudokite atskiras šakas ir prieš pradėdami atsinaujinkite kodą. Raktų nesiųskite per Git.
