# Makaranya

Magyar nyelvű, reszponzív macaron oldal termékkatalógussal, kosárral és e-mailes rendelésfelvétellel.

## Rendelési folyamat

1. A vásárló ízenként összeállítja a dobozát.
2. A kosár kiszámítja a minta termékek összegét és bekéri a kapcsolattartási adatokat.
3. A `netlify/functions/order.mjs` szerveroldalon ellenőrzi a termékeket és újraszámítja az összeget.
4. A Resend elküldi a rendelést az üzletnek, valamint a visszaigazolást a vásárlónak.

A rendelés ebben a verzióban nem tartalmaz online fizetést. Az átvétel, a szállítás és a fizetés részleteit utólag kell egyeztetni.

## Netlify telepítés

1. A Netlify felületén válaszd az **Add new project → Import an existing project** lehetőséget.
2. Kapcsold hozzá a `cooldance84/makaranya` GitHub repositoryt.
3. Build command nem szükséges; a publish könyvtár `.`.
4. A **Project configuration → Environment variables** részen add hozzá:

```text
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM=Makaranya <rendeles@sajat-domain.hu>
ORDER_EMAIL=tiborcz.kiss@gmail.hu
```

5. A Resendben ellenőrizd a küldő domaint, majd indíts új Netlify deployt.

A `RESEND_API_KEY` titkos adat: soha ne kerüljön a repositoryba vagy a böngészőben futó JavaScriptbe. A `.env.example` csak a szükséges változóneveket mutatja.

## Helyi megtekintés

Az oldal kinézete az `index.html` megnyitásával ellenőrizhető. A rendelési e-mail helyi teszteléséhez Netlify CLI és egy kitöltött, git által figyelmen kívül hagyott `.env` fájl szükséges.
