# 15 užduotis: išsaugoti AI pritaikytą receptą

## Kaip naudotis

1. Prisijunkite prie savo FridgeFork paskyros.
2. Atidarykite receptą ir spauskite **Pritaikyti receptą**.
3. Įrašykite prašymą ir, jei reikia, pasirinkite laiką, žmonių skaičių bei tikslą.
4. Spauskite **Pritaikyti receptą** ir palaukite Gemini atsakymo.
5. Po atsakymu spauskite **Išsaugoti pritaikytą receptą**. Pavykus mygtukas pasikeis į **Išsaugota**.
6. Atidarykite **Mano AI receptai**. Paspaudę receptą matysite prašymą, pasirinkimus, AI rezultatą ir originalų receptą. Kortelėje matoma išsaugojimo data.
7. Šiukšliadėžės mygtukas pašalina išsaugotą AI receptą iš jūsų kolekcijos.

## Kur saugomi duomenys

Naudojama esama Supabase lentelė `public.account_data`: jos `user_id` priklauso prisijungusiam vartotojui, o `adaptations` yra jo AI receptų sąrašas. Kiekviename elemente saugoma originalaus recepto kopija su pavadinimu (`meal`), prašymas ir pasirinkimai (`request`), Gemini rezultatas (`result`), išsaugojimo data (`createdAt`) ir įrašo identifikatorius (`id`). `user_id` saugomas bendroje vartotojo eilutėje, todėl jo nereikia kartoti kiekviename sąrašo elemente.

Duomenys įrašomi tik po sėkmingo Supabase atsakymo. Nepavykus išsaugoti ar pašalinti, rodomas klaidos pranešimas. Keičiantis paskyrai kolekcija perkraunama.

RLS – duomenų bazės taisyklės, leidžiančios skaityti ir keisti tik tą eilutę, kurios `user_id` sutampa su prisijungusiu vartotoju. Taisyklės jau aprašytos `supabase/schema.sql`; naujos lentelės ar migracijos šiai užduočiai nereikia, jei schema jau įdiegta. Nekartokite viso schema.sql veikiančioje duomenų bazėje, nes politikos jau gali egzistuoti.

## Patikrinimas su dviem paskyromis

1. Paskyroje A pritaikykite ir išsaugokite receptą.
2. Perkraukite puslapį: receptas turi likti kolekcijoje.
3. Atidarykite išsaugotą receptą, tada atsijunkite: jo peržiūra neturi likti matoma.
4. Prisijunkite paskyra B: A recepto neturi būti.
5. Grįžkite į A ir ištrinkite receptą. Perkrovus jis neturi grįžti.

Automatinis `tests/adaptations-rls.test.ts` tikrina schemos taisykles vietinėje PostgreSQL aplinkoje. Jis nekeičia jūsų nuotolinio Supabase projekto; faktinį jo sukonfigūravimą patvirtina aukščiau aprašytas bandymas su tikromis paskyromis.
