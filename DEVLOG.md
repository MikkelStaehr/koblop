# Driwe — Devlog

Et planlægningsværktøj til kørelærere. Løbende udviklingslog: beslutninger,
fremskridt og hvorfor tingene er som de er. Nyeste øverst.

---

## 2026-06-25 — Booking-flow + kalender på egen side

**Funktioner frem for design (kundens ønske):**
- **Kalender flyttet til egen side** (`/kalender`) med uge-navigation + nav-punkt
  for begge roller. Forsiden viser nu en kompakt **"Næste 7 dage"-agenda**
  (`Upcoming`) i stedet for det store grid.
- **Booking-flow (kernen):** eleven kan booke en køretime på `/book`.
  - `getBookingOptions`: finder elevens aktive modul, tjekker teori-før-praksis,
    vælger næste ledige praksislektion, og genererer ledige slots (14 dage frem)
    ud fra lærerens tilgængelighed minus optagne tider (`instructor_busy` RPC).
  - Server action `bookSlot`: validerer ejerskab, modulstatus, fortid og
    lærer-konflikt, og indsætter bookingen. Booking-triggeren sætter lektionen
    til `planlagt`.
- **Verificeret end-to-end via RLS:** logget ind som elev → insert tilladt →
  trigger satte lektionsstatus til `planlagt`. Build grøn.

**Designgæld noteret:** kalender-grid er stadig grimt og skal redesignes senere.

---

## 2026-06-25 — App-shell, navigation, feed + fuldbredde

Kunde-feedback omsat:
1. **Fuld bredde / responsivt:** indhold er ikke længere låst til smal kolonne.
   AppShell med max-w-7xl; kalenderen fylder bredden på desktop, scroller på mobil.
2. **Navigation:** ny `AppShell` — sidebar på desktop, bundnav på mobil. Nav pr.
   rolle: kørelærer (Oversigt, Elever, Hold, Indstillinger), elev (Mit forløb, Book tid).
3. **Indstillinger:** nav-punkt + placeholder (tilgængelighed/skole/ressourcer kommer her).
4. **Login:** demo-knapperne fjernet — rollen afgøres ved login via profilen.
5. **Feed i toppen:** `FeedBanner` for begge roller med afledte påmindelser
   (kørelærer: elever der afventer godkendelse, bookinger i ugen; elev: næste
   køretime, aktuelt modul) + placeholder for beskeder fra teori-/kørelærer.

**Struktur:** dashboard + nav-sider flyttet ind i en `(app)`-rutegruppe med fælles
`layout.tsx` (auth + shell). Nye sider: /elever (rigtig liste), /hold, /indstillinger,
/book (placeholders). Build grøn, alle ruter genereres.

---

## 2026-06-25 — One-page dashboard + kalender + rebrand til "koblop"

**Navn:** Appen hedder nu **koblop** (ikke Driwe). Logo er et wordmark, altid med
småt, sat i brand-fonten Excon (`src/fonts/Excon_Complete`, variabel TTF via
next/font/local → `--font-excon`). Komponent: `src/components/Logo.tsx`.

**Bygget — første frontend-slice (mobile-first):**
- Auth-context-helper (`lib/auth.ts`) + rolle-baseret forside.
- One-page dashboard (`app/page.tsx`) med uge-navigation (?w=offset):
  - **Kørelærer:** ugekalender (bookinger + tilgængelighed) + liste over aktive
    elever med aktuelt modul og fremdrift.
  - **Elev:** egen kalender + forløb som modul-tidslinje (teori/køretimer pr. modul).
- `WeekCalendar` (client): horisontalt scrollbart uge-grid, events placeret efter tid.
- Data-queries (`lib/queries/dashboard.ts`) mod live DB via RLS.
- **Demo-seed** (`scripts/seed-demo.mjs`, `npm run seed:demo`): skole, kørelærer,
  3 elever m. forløb, tilgængelighed (man-fre 8-16) og en booking. Idempotent.
  Login: laerer@koblop.test / anna|bo|clara@koblop.test — kode `123!`.

**Verificeret:** typecheck + `next build` grønt; smoke-test: /login=200, /=307→/login.

**Opfølgning:** Next 16 har omdøbt `middleware`-konventionen til `proxy` (kun en
deprecation-warning lige nu). Booking-UI (elev opretter selv) er næste skridt.

---

## 2026-06-25 — Officiel 5-moduls-model + database live

**Stor ændring:** Kunden leverede den autoritative læreplan — den MODERNISEREDE
køreuddannelse gældende 1.7.2026. Den er modulopbygget, ikke lektion-for-lektion
som mit udkast. Hele datamodellen er skrevet om efter den.

**Kategori B = 5 moduler, 30 teori + 24 praksis = 54 lektioner:**
- M1 Grundlæggende trafikforståelse (7 teori, 0 praksis)
- M2 Bilen og grundlæggende manøvrer (5 teori, 3 praksis — manøvrebane)
- M3 Kørsel i trafik (8 teori, 6 praksis — vej)
- M4 Kompleks trafik (9 teori, 6 praksis — vej)
- M5 Køreteknik og prøveforberedelse (1 teori, 9 praksis — glatbane/vej)

**Regelmodel (afløser tidligere "porte"-graf):**
- Moduler er strengt sekventielle (M+1 åbner når M er godkendt af lærer).
- Teori-før-praksis i hvert modul (praksis kan først bookes når teorien er taget).
- Selvstudium ≤ 7 lektioner; maks. 8 lektioner/dag, heraf ≤ 3 praktiske.
- Krav uden for moduler: førstehjælp (kursus), teoriprøve, praktisk prøve.

**Skema-ændringer:** `modules` har nu lektionstal + venues + topics; nye tabeller
`lesson_progress`, `additional_requirements`, `enrollment_requirements`. Bookinger
peger på en konkret lektion. Triggere: seed af forløb ved enrollment, modul-advance
ved godkendelse, og booking→lesson-statussync (security definer).

**Database er nu LIVE:** alle 4 migrations pushet til Supabase (region
aws-1-eu-central-1). Verificeret: 30+24=54 lektioner + 3 krav seedet korrekt.

**Bøvl undervejs (noteret så vi ikke gentager det):**
- Pooler-host: brugeren havde `aws-0-<region>` som placeholder i `SUPABASE_DB_URL`.
  Rigtig host var `aws-1-eu-central-1`. Kopiér ALTID strengen fra dashboardets
  "Connect"-knap frem for at bygge den fra skabelon.
- `supabase gen types --db-url` kræver Docker (postgres-meta i container). Uden
  Docker er typerne i database.types.ts håndskrevet og holdes manuelt på linje
  med migrations (eller regenereres når Docker/SUPABASE_ACCESS_TOKEN er der).

### Næste
Frontend: elevens side (forløb som tidslinje + booking) eller lærerens side
(elevdatabase + afkrydsning + tilgængelighed).

---

## 2026-06-25 — ⚠️ Sikkerhedshændelse: lækket service_role-nøgle

**Hvad skete der:** I commit `bda1c93` blev `.env.example` committet med RIGTIGE
`service_role`- og `anon`-JWT'er (de var blevet skrevet ind i template-filen i
stedet for `.env.local`). Filen blev pushet til det offentlige repo. Årsag:
`git add -A` + commit uden at verificere at værdierne var placeholders.

**Remediation:**
- `.env.example` nulstillet til placeholders + advarsel i filen.
- Git-historik omskrevet (amend af tip), force-pushet → ingen reachable commit
  indeholder nøglerne. Lokal reflog expired + gc.
- DB-password lækkede IKKE (kun i untracket `.env.local`).
- **Nøgler roteres i Supabase (JWT secret) — gammel commit kan stadig hentes via
  SHA på GitHub indtil GC, så rotation er det egentlige fix.**

**Læring:** Skriv aldrig rigtige nøgler i `.env.example`. Tilføj evt. en
pre-commit secret-scan (gitleaks) før vi går videre.

---

## 2026-06-25 — Fundament & scaffolding

### Idé
Tvedelt værktøj der frigør kørelærere fra planlægning, så de kan undervise:
1. **Lærerens side** — database over aktive elever og deres progression.
2. **Elevens side** — eget forløb i køreskolen, fra start til slut.

Al teori er ens og lovbestemt → et fast start-til-slut-flow. Læreren "krydser af"
når eleven har gennemført. Eleven booker køretimer, men kun ved det modul de er
nået til. Læreren har prædefinerede tider; eleven ser hvad der er ledigt.

### Afklarede beslutninger (kunde-input)
- **Læreplan:** følger de lovbestemte moduler (rækkefølge + varighed er fastlagt).
  Alle kategorier kan i princippet ind. → modelleret som central reference-data.
- **Manøvrebane, glatbane, førstehjælp:** håndteres som *events* læreren opretter
  (ofte eksterne lokationer).
- **Lektionsplan/signatur:** uden for scope. Dette er et planlægningsværktøj,
  ikke en erstatning for lektionsplanen.
- **Skala:** multi-tenant SaaS — så mange køreskoler som muligt.
- **Flere lærere pr. skole:** ja. Elever kan dele/skifte lærer.
- **Afbud:** elev + lærer, inden for en frist skolen selv sætter (fx 24t).
- **Onboarding:** læreren opretter eleven; eleven får login via mail.
- **Login:** alle metoder (email/password, magic link, MitID senere).
- **Gating-model:** *parallelle spor med porte* — teori og kørsel løber samtidigt,
  men med lovbestemte porte (et modul åbner når dets forudsætninger er afkrydset).
- **Stack:** Next.js + Supabase (Postgres + Auth + RLS). Mobile-first design.
- **Betaling/notifikationer/tidsramme:** udskudt til fundamentet står.

### Bygget i dag
- **Scaffold:** Next 16, React 19, TypeScript, Tailwind 4, App Router, `src/`.
- **Supabase init** + 4 migrations:
  - `..130000_init_schema` — tabeller, enums + triggere: auto-generér elevforløb
    ved enrollment, og lås moduler op når porte afkrydses.
  - `..131000_rls_policies` — multi-tenant RLS (elev ser kun egne data; staff ser
    hele skolen; læreplan er central læse-data).
  - `..132000_booking_rpc` — `instructor_busy()` så elever kan beregne ledige
    tider uden at se andres bookinger.
  - `..133000_seed_category_b` — kat. B-læreplan, 17 moduler med porte
    (**UDKAST** — skal verificeres mod officiel undervisningsplan).
- **Next-wiring:** Supabase-klienter (browser/server/admin/middleware), login-side
  (password + magic link), auth-callback, danske domæne-labels.
- Typecheck kører rent.

### Datamodellens kerne
`schools` (tenant) → `profiles` (admin/instructor/student), `resources`, `events`.
`categories` → `modules` → `module_prerequisites` (central læreplan).
`enrollments` → `module_progress` (elevens forløb).
`availability_rules/_exceptions` + `bookings` (booking-motoren).

Porte = eksplicitte `module_prerequisites`-kanter. Et modul bliver `available`
når alle dets forudsætninger er `completed`. Dækker både sekventielt og
parallelt-med-porte med samme mekanik.

### Åbne punkter
- [ ] Push migrations + generér TS-typer (afventer Supabase-credentials i `.env.local`).
- [ ] Verificér kat. B-læreplan mod officiel undervisningsplan.
- [ ] MitID som custom OIDC (senere).
- [ ] Beslut: betaling, notifikationer, tidsramme.

### Næste
Elevens side (forløb som tidslinje + booking) eller lærerens side (elevdatabase
+ afkrydsning + tilgængelighed). Afventer valg.
