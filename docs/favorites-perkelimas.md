# Mėgstamų receptų perkėlimas į atskirą lentelę

## Ką pakeitėme

Visiems vartotojams naudojama viena `public.favorites` lentelė. Viena eilutė reiškia vieno vartotojo išsaugotą receptą. `user_id` susieja eilutę su `auth.users`; RLS neleidžia kitam vartotojui jos skaityti ar keisti.

| Stulpelis     | Reikšmė                                            |
| ------------- | -------------------------------------------------- |
| `id`          | Unikalus eilutės UUID                              |
| `user_id`     | Vartotojo UUID                                     |
| `recipe_id`   | TheMealDB recepto ID                               |
| `recipe_name` | Recepto pavadinimas                                |
| `image_url`   | Recepto nuotraukos adresas                         |
| `recipe_data` | Pilnas receptas JSON formatu, įskaitant kategoriją |
| `note`        | Asmeninė pastaba, iki 3000 simbolių                |
| `created_at`  | Išsaugojimo laikas                                 |

Poros `user_id + recipe_id` unikalumas neleidžia to paties recepto tam pačiam vartotojui išsaugoti dukart. Pakartotinis išsaugojimas neištrina ankstesnės pastabos. Pastabos keitimas atnaujina tik `note`, o pašalinimas iš mėgstamų ištrina tik konkrečią eilutę.

## Veiksmai jums abiem

1. Abu sustabdykite seną aplikacijos versiją ir atsinaujinkite kodą per Git. Iki perkėlimo nekurkite naujų mėgstamų receptų senojoje versijoje.
2. **Vienas partneris** bendrame Supabase projekte atidaro **SQL Editor → New query**.
3. Nukopijuoja VISĄ `supabase/migrations/20261116_favorites.sql` turinį ir paspaudžia **Run**. Naujam projektui prieš tai vieną kartą paleidžiamas `supabase/schema.sql`; esamame projekte jo kartoti nereikia.
4. **Table Editor → favorites** patikrina perkeltus receptus ir atskirą `note` stulpelį. Abu partneriai mato tą pačią bendrą duomenų bazę, todėl kiekvienam atskirai SQL paleisti nereikia.
5. Abu paleiskite `npm.cmd run dev`, atsijunkite ir vėl prisijunkite arba perkraukite puslapį.
6. Išsaugokite receptą, pridėkite pastabą, perkraukite puslapį ir patikrinkite, kad ji išliko. Supabase atnaujinkite lentelės vaizdą ir patikrinkite `note` langelį.
7. Patikrinkite kategorijų filtravimą, recepto pašalinimą ir dvi skirtingas aplikacijos paskyras: kiekviena turi matyti tik savo kolekciją.

## Esamų duomenų apsauga

- Perkėlimas vykdomas viena transakcija: įvykus klaidai pakeitimai atšaukiami.
- Esami receptai ir pastabos kopijuojami iš `account_data.favorites`; seni duomenys neištrinami.
- Sena JSON kopija po perkėlimo nebeatnaujinama. Tikrieji mėgstami receptai ir pastabos nuo šiol yra lentelėje `favorites`.
- Techninė `fridgefork_migrations` lentelė žymi atliktą perkėlimą. Ji neprieinama naršyklės vartotojams. Pakartotinai paleidus SQL seni receptai nekopijuojami iš naujo, todėl ištrinti receptai neatsiranda vėl.
- Netrinkite perkėlimo žymos ir negrąžinkite senos aplikacijos versijos be atskiro atgalinio duomenų perkėlimo plano.
- Jeigu SQL praneša apie netinkamus senus įrašus, nenutrinkite jų ir nenaudokite atsitiktinių pataisymų. Pirmiausia išsiaiškinkite klaidą.

Šiam SQL reikia projekto SQL Editor prieigos. Viešas `.env.local` publishable / anon raktas nesuteikia teisės kurti lentelių. Į naršyklės konfigūraciją nereikia dėti jokių papildomų slaptų raktų.
