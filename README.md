# Makaranya

Magyar nyelvű, reszponzív macaron-weboldal prémium termékfotókkal, interaktív dobozépítővel és e-mailes rendelésfelvétellel.

## Fő funkciók

- 6, 12 vagy 18 darabos, szabadon összeállítható macaronos doboz
- valós idejű töltöttségjelző, kosár és végösszeg
- négy mintaíz saját termékfotóval
- egy kattintással kosárba tehető, 12 darabos szezonális válogatás
- mobilbarát fotógaléria és bemutató vásárlói vélemények
- Netlify Function alapú rendelésfeldolgozás
- e-mail az üzletnek és automatikus visszaigazolás a vásárlónak
- szerveroldali termék-, ár- és dobozméret-ellenőrzés

> A véleményszekcióban jelenleg egyértelműen jelölt mintaszövegek szerepelnek. Élesítés előtt valódi, engedéllyel közzétett vásárlói visszajelzésekre kell cserélni őket.

## Rendelési folyamat

1. A vásárló kiválasztja a 6, 12 vagy 18 darabos dobozt.
2. Ízenként összeállítja a válogatását, vagy betölti a kész szezonális dobozt.
3. A rendelés csak teljesen megtöltött dobozzal küldhető el.
4. A `netlify/functions/order.mjs` szerveroldalon újra ellenőrzi a termékeket, a darabszámot és az árakat.
5. A Resend elküldi a rendelést az üzletnek, valamint a visszaigazolást a vásárlónak.

A rendelés ebben a verzióban nem tartalmaz online fizetést. Az átvétel, a szállítás és a fizetés részleteit utólag kell egyeztetni.

## Képi anyagok

Az AI-val készített, webre optimalizált képek az `assets/images/` könyvtárban találhatók:

- `hero-macarons.jpg`
- `rose-raspberry.jpg`
- `salted-pistachio.jpg`
- `lemon-meringue.jpg`
- `dark-chocolate.jpg`
- `seasonal-gift-box.jpg`

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

Az oldal megjelenése az `index.html` megnyitásával ellenőrizhető. A rendelési e-mail helyi teszteléséhez Netlify CLI és egy kitöltött, git által figyelmen kívül hagyott `.env` fájl szükséges.
