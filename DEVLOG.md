# Driwe — Devlog

Et planlægningsværktøj til kørelærere. Løbende udviklingslog: beslutninger,
fremskridt og hvorfor tingene er som de er. Nyeste øverst.

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
