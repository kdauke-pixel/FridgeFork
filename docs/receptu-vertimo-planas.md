# Receptų vertimas į lietuvių kalbą

Išsaugotas planas būsimam etapui. Vertimo įgyvendinimas dar nepradėtas.

## Tikslas

TheMealDB receptų pavadinimus, ingredientus, matavimo vienetų tekstą ir gaminimo instrukcijas rodyti lietuviškai. Vertimui naudoti Gemini, o paruoštus vertimus saugoti Supabase, kad tas pats receptas nebūtų verčiamas kiekvienos peržiūros metu.

## Darbų seka

1. Paruošti serverio Gemini raktą `.env.local` faile.
2. Pradėti nuo vieno atidaryto recepto vertimo. Gemini turi grąžinti struktūruotą JSON pagal recepto laukus. Tikrinti atsakymo struktūrą, ingredientų skaičių, kiekius, laiką ir temperatūrą; originalą išsaugoti atskirai.
3. Supabase sukurti bendrų vertimų lentelę su recepto ID, kalba ir išverstu turiniu. Skaitymo ir serverio įrašymo teises suplanuoti prieš įgyvendinimą; naršyklei neleisti laisvai perrašyti bendrų vertimų.
4. Recepto gavimo metu pirmiausia ieškoti išsaugoto vertimo. Jei jo nėra, serveryje išversti, patikrinti ir išsaugoti.
5. Pridėti lietuviškus pavadinimus katalogo kortelėse ir išverstą turinį recepto skydelyje. Numatyti krovimo būseną ir originalo rodymą su pranešimu, jei vertimas nepavyksta.
6. Patikrinti vertimo tikslumą ir pakartotinį išsaugoto vertimo naudojimą.

## Paieška

Paieška lietuviškai yra atskiras papildymas: lietuviškas užklausas reikės susieti su angliškomis TheMealDB reikšmėmis arba ieškoti išsaugotuose vertimuose. API paieškai palikti originalius ingredientų pavadinimus ir receptų ID.

## Įgyvendinimo principai

- Dirbti pažingsniui: vienas receptas → vertimų saugojimas → lietuviški katalogo pavadinimai → lietuviška paieška.
- Vertimas nekeičia recepto ir nepakeičia atskiros AI pritaikymo funkcijos.
- Gemini raktas lieka serveryje, nepatenka į Git ar Developer Mode.
- Masinio vertimo apimtį ir užklausų ribas sutarti prieš verčiant katalogą.
