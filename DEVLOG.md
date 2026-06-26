# Driwe — Devlog

Et planlægningsværktøj til kørelærere. Løbende udviklingslog: beslutninger,
fremskridt og hvorfor tingene er som de er. Nyeste øverst.

---

## 2026-06-26 — Onboarding: kørelæreren opretter elever

Demo → reelt brugbart: kørelæreren kan nu selv oprette en elev fra `/elever`.

- **Server action `createStudent`** (`lib/actions/students.ts`): opretter auth-bruger
  (bekræftet) → profil (role=student, skole) → enrollment (kat. B). Enrollment-
  triggeren seeder hele forløbet (5 moduler + 54 lektioner). Ruller tilbage ved fejl
  (sletter profil + auth-bruger). Returnerer et **login-link** til eleven.
- **UI:** "Opret elev"-formular (navn/e-mail/telefon) på `/elever`. Efter oprettelse
  vises et delbart login-link med kopiér-knap.

**Vigtigt valg — createUser frem for inviteUserByEmail:** dette projekts Auth
afviser ikke-rigtige e-maildomæner (`.test`, `example.com`) for `invite`/
`generateLink type=invite` (`email_address_invalid`), og vi kan ikke garantere SMTP.
`admin.createUser({ email_confirm: true })` virker uden SMTP og uden den strikse
domæne-validering (det er sådan seed-brugerne med `.test` blev lavet). Login-linket
genereres med `generateLink type=magiclink` (best effort) → virker uden mail-udsendelse;
kørelæreren deler linket. Eleven kan også bruge magisk link på login-siden.

**Verificeret end-to-end mod live DB:** createUser → profil (201) → enrollment (201)
→ trigger seedede 5 moduler + 54 lektioner; magiclink gav et brugbart action_link.
Alt testdata (auth-bruger, profil, enrollment) ryddet op. Typecheck + lint grønne.

**Næste:** når SMTP sættes op kan vi skifte til ægte invitations-mails; pt. er
delbart link den robuste vej. Overvej også sletning/pause af elever.

---

## 2026-06-26 — Afbud/aflysning: kerneløkken lukket

Sidste hul i kerneløkken. Både elev og kørelærer kan nu aflyse en booking.

- **Server action `cancelBooking`** (`lib/actions/booking.ts`): sætter
  `status=cancelled` + `cancelled_by/at`. Booking-triggeren reverterer lektionen
  til `ikke_planlagt`, så tiden bliver bookbar igen.
- **Afbudsfrist håndhævet** (bruger `schools.cancellation_window_hours`, default
  24t): elever kan kun aflyse online uden for fristen; **staff kan aflyse når som
  helst** (de kan rydde op tæt på tidspunktet). For sent → besked om at kontakte
  kørelæreren.
- **UI:** aflys-knap (to-trins "Aflys → Bekræft") på hver booking i "Næste 7
  dage"-agendaen, for begge roller. Kun rigtige bookinger (`bookingId` sat på
  AgendaItem, kun når status er `booked`) — teorigange og gennemførte timer kan
  ikke aflyses herfra.

**Verificeret end-to-end mod live DB:** oprettede booking → lektion blev
`planlagt`; aflyste → trigger satte lektionen tilbage til `ikke_planlagt` med
`scheduled_at` nulstillet. Testdata ryddet op. Typecheck + lint grønne.

**Kerneløkken er nu hel:** elev booker → (evt. aflys, tid frigives) → lærer
afholder → krydser af → modul godkendes → næste låses op.

---

## 2026-06-26 — Lucide-ikoner ind

Erstattede de håndlavede SVG-ikoner med `lucide-react`:
- `app-shell/Icon.tsx` mapper nu nav-ikonnavnene (grid/users/layers/settings/
  calendar) til lucide-komponenter — hele navigationen får konsistente ikoner
  uden ændringer andre steder.
- `AgendaList` bruger `Clock` + `MapPin` i stedet for inline-SVG.

Lucide har samme stroke-stil (1.8) som de gamle, så udseendet er konsistent.
Typecheck + lint grønne. Fremover: brug lucide til nye ikoner frem for inline-SVG.

---

## 2026-06-26 — Elevens hold + kommende teorigange (+ RLS-rekursion fixet)

Eleven ser nu sit teorihold tre steder:
- **"Mit teorihold"-kort** på forsiden (sidekolonnen): holdnavn, kørelærer og de
  næste teorigange.
- **"Næste 7 dage"-agendaen**: teorigange flettes ind sammen med køretimer
  (amber-tone, "Teorihold"-label).
- **Kalenderen**: teorigange i den viste uge vises som events.

Drevet af ny query `getStudentClasses` (enrollments → class_members → classes →
class_sessions), som RLS scoper til elevens egne hold.

**RLS-bug fanget og fixet (`20260626150000_teorihold_rls_fix.sql`):** de første
hold-policyer havde uendelig rekursion (Postgres 42P17) — `classes`-policyen læste
`class_members` og omvendt, så de kaldte hinanden i ring. Det blokerede AL
hold-læsning for både elever og staff. Fix: parent-opslag (skole-via-hold,
medlemskab) flyttet til `SECURITY DEFINER`-funktioner (`class_school_id`,
`session_school_id`, `is_class_member`), så policyerne ikke længere krydser
hinandens tabeller under RLS.

**Verificeret mod live DB med ægte elev-JWT:** logget ind som Anna → læser sit
hold + teorigange uden rekursionsfejl. Bekræftede at ingen andre rekursions-stier
findes (øvrige opslag går kun til enrollments/profiles/modules). Testdata ryddet
op. Typecheck + lint grønne.

**Læring:** Krydsende RLS-policyer mellem to tabeller giver rekursion — brug
SECURITY DEFINER-helpers til parent-opslag (samme mønster som `current_school_id`).

---

## 2026-06-26 — Teorihold: kohorte + teorigange + fremmøde

Kundens model: elever knyttes til et hold (kohorte), holdet har planlagte
teorigange, og fremmøde-afkrydsning gennemfører elevernes teorilektioner. Hold
er et organiserings-lag oven på elever der allerede hører til skolen (onboarding
bygges separat senere).

**Nyt skema** (`20260626140000_teorihold.sql`):
- `classes` (hold), `class_members` (forløb knyttet til hold), `class_sessions`
  (teorigang — dækker ét modul + én teorilektion), `session_attendance`.
- Fuld RLS: staff styrer egen skoles hold; elever læser egne (member/own).

**UI/logik:**
- `/hold`: liste + opret hold.
- `/hold/[id]`: tilføj/fjern elever (fra skolens aktive forløb) + opret
  teorigange (modul → teorilektion → tidspunkt/varighed/emne).
- `/hold/[id]/session/[sid]`: fremmøde. Markér til stede → server-action
  upserter `session_attendance` OG sætter elevens matchende teori-lektion
  (`module_id` + `type=teori` + `lesson_no`) til `godkendt`. Fortryd reverterer.
  Genbruger samme afkrydsnings-mekanik som lærerens elev-checklist.

**Fremmøde gennemføres i action, ikke trigger** — bevidst, så logikken er
eksplicit og fremmøde + lektionsstatus holdes i sync ét sted.

**Verificeret end-to-end mod live DB:** oprettede hold → tilføjede elev →
teorigang → fremmøde, og bekræftede at den korrekte `lesson_progress`-række
(enrollment+modul+teori+lektion) blev `godkendt`. PostgREST-embeds (count +
nested) returnerer forventet form. Alt testdata ryddet op og demo-data
gendannet. Typecheck + lint grønne.

**Bemærk:** et medlem kan i princippet være på flere hold (kun unik pr.
(hold, forløb)); "ét hold pr. elev" håndhæves ikke i DB endnu. Fremmøde og
lærerens manuelle afkrydsning rører samme lektion — sidste handling vinder.

---

## 2026-06-26 — Lærerens afkrydsning: progression låses op

**Største hul lukket:** hele lærersiden var read-only. Kørelæreren kunne se
elever og fremdrift, men ikke udføre kerneopgaven — krydse af. Da moduler er
strengt sekventielle og kun låses op når læreren godkender det forrige, sad
*alle* elever reelt fast i deres nuværende modul. Nu er afkrydsningen bygget.

- **Elev-detaljeside** `/elever/[id]`: modulerne som kort med lektioner. Klik på
  en elev i `/elever`-listen åbner den.
- **Afkryds lektioner:** checkbox pr. lektion → `godkendt` (sætter `approved_by`
  + `completed_at`); fortryd → tilbage til `ikke_planlagt`. Virker for både teori
  og praksis.
- **Godkend modul:** knap pr. modul → `gennemfoert` (sætter `signed_off_by/at`).
  DB-triggeren `advance_modules` låser så næste modul op. "Genåbn modul" fortryder.
- **Sikkerhed:** server actions (`lib/actions/progress.ts`) gør kun selve
  opdateringen — RLS (`*_write_staff`) håndhæver at staff kun rører egen skoles
  elever. Låste moduler kan ikke krydses af (UI skjuler dem).

**Verificeret live mod DB:** godkendte modul 2 på et forløb → modul 3 gik
`laast` → `i_gang` via triggeren, derefter rullet tilbage. Typecheck + lint
grønne; begge nye ruter kompilerer (307→login uden auth).

**Bemærk:** "Genåbn modul" låser ikke det næste modul igen (bevidst simpelt for
nu). Et modul får ikke automatisk status `afventer_godkendelse` når alle lektioner
er godkendt — læreren godkender direkte. Begge kan strammes senere.

---

## 2026-06-26 — Tilgængelighed: kørelæreren sætter selv sine bookbare tider

**Hul lukket:** booking-motoren (`getBookingOptions`) har hele tiden læst lærerens
`availability_rules`, men de kunne **kun** sættes via seed-scriptet. Nu kan
kørelæreren selv styre dem fra `/indstillinger` — kerneløkken er selvbetjenende.

- **`/indstillinger`** er ikke længere en placeholder: ugentligt skema (man-søn,
  mandag-først), én tidsblok pr. dag med til/fra + start/sluttid.
- **Server action `saveAvailability`** (`lib/actions/availability.ts`): rolle-guard
  (instructor/admin), validerer TT:MM + start<slut, og **rewriter** lærerens regler
  (slet egne → indsæt). RLS sikrer at man kun rører egne rækker.
- **`AvailabilityEditor`** (client): optimistisk redigering + gem-knap, samme
  besked-mønster som `BookingSlots`.
- Weekday-konvertering på linje med resten: UI er mandag-først, DB er 0=søndag
  (`dbWeekday = (mondayIndex + 1) % 7`).

Verificeret: typecheck + lint grønne; ruten kompilerer (307→login for ikke-auth);
datamapning stemmer med seed (man-fre 08-16). Booking-queryen understøtter allerede
flere blokke pr. dag, så split-vagter kan tilføjes i UI senere uden skema-ændring.

**Næste i Indstillinger:** skoleoplysninger, ressourcer (skolevogne), afbudsregler.

---

## 2026-06-25 — Dashboard: agenda + Påmindelser/Beskeder-bokse

Kunde-retning (inspireret af Bookings-liste-design):
- **To bokse øverst** side om side: **Påmindelser** (afledte: aflysninger fx
  "Anna har aflyst en køretime", elever der afventer godkendelse, ugens
  bookinger) og **Beskeder** (fra `messages`-tabel, fx "Bo: Kan jeg tage ekstra
  teori?").
- **"Vertikal kalender" (AgendaList)** på forsiden: dato-chip + tid + lokation +
  **initial-avatars** for deltagere (elev/lærer). Erstatter den simple liste.
- Ny `messages`-tabel (+ RLS + seed) driver Beskeder-boksen. `Avatar`-komponent
  (initialer m. farve — profilbilleder senere).
- Booking-trigger rettet: en booking oprettet som `cancelled` markerer ikke
  længere lektionen som planlagt.

Verificeret: beskeder + aflysning seedet og læsbare; build grøn.

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
