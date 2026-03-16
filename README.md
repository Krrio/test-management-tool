# TMT (Test Management Tool)

TMT to aplikacja do zarzadzania przypadkami testow, zbudowana na Next.js App Router. Pozwala zespolom QA planowac przebieg testow, monitorowac status krokow oraz wspolpracowac w czasie rzeczywistym na wspolnej strukturze projektowej.

## Wymagania wstepne
- Node.js >= 18.18 (zalecane 20.x)
- npm >= 10 (lub pnpm/bun jesli preferujesz)
- Dostepna baza danych MongoDB
- Konfiguracja Clerk (klucze publiczne i secret) oraz Pusher (do synchronizacji realtime)

## Konfiguracja srodowiska
1. Utworz plik `.env.local` w katalogu glownym projektu.
2. Uzupelnij go zgodnie z ponizszym schematem (wartosci przykladnicze, dostosuj do swoich uslug):

```ini
# Baza danych
MONGODB_URI=mongodb+srv://uzytkownik:haslo@host/nazwa-bazy

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/tmt
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/tmt

# Pusher
PUSHER_APP_ID=
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_CLUSTER=eu

# Stripe (opcjonalnie dla płatnych planow)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_PRICE_BASIC_MONTHLY=
STRIPE_PRICE_BASIC_YEARLY=
STRIPE_PRICE_BUSINESS_MONTHLY=
STRIPE_PRICE_BUSINESS_YEARLY=
STRIPE_PRICE_ENTERPRISE_MONTHLY=
STRIPE_PRICE_ENTERPRISE_YEARLY=

# Jira (wymagane, jesli chcesz tworzyc issue z poziomu kroku testowego)
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=
JIRA_ISSUE_TYPE=Task
```

> Aplikacja korzysta z autoryzacji Clerk dla wszystkich tras (patrz `middleware.ts`). Brak poprawnej konfiguracji Clerk lub Pusher spowoduje brak dostepu do glownego UI lub wylaczenie funkcji czasu rzeczywistego.

## Instalacja i uruchomienie
```bash
npm install
# (opcjonalnie) zaladuj dane demo po ustawieniu MONGODB_URI
npm run seed
npm run dev
```

- Dev server domyslnie startuje na `http://localhost:3000`.
- Produkcyjne uruchomienie: `npm run build` oraz `npm run start`.
- Kontrola jakosci: `npm run lint`.

## Szybki start dla developera (krok po kroku)

Ponizsza procedura pozwala uruchomic aplikacje lokalnie, zalogowac sie i od razu pracowac na test case'ach.

### 1) Przygotuj zewnetrzne uslugi

1. **MongoDB**
   - Utworz baze (np. MongoDB Atlas).
   - Skopiuj connection string do `MONGODB_URI`.

2. **Clerk (logowanie)**
   - W Clerk utworz aplikacje.
   - Skopiuj:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
   - W ustawieniach Clerk dodaj lokalne redirecty:
     - Sign-in URL: `/sign-in`
     - Sign-up URL: `/sign-up`
     - After sign-in: `/tmt`
     - After sign-up: `/tmt`

3. **Pusher (realtime)**
   - Utworz aplikacje Channels.
   - Ustaw klucze:
     - `PUSHER_APP_ID`
     - `NEXT_PUBLIC_PUSHER_KEY`
     - `PUSHER_SECRET`
     - `NEXT_PUBLIC_PUSHER_CLUSTER`

4. **Stripe (opcjonalnie)**
   - Wypelnij tylko, jesli testujesz checkout/plany.

### 2) Skonfiguruj `.env.local`

Utworz plik `.env.local` i wypelnij wszystkie wymagane pola. Minimalny zestaw do lokalnego uruchomienia:

```ini
MONGODB_URI=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/tmt
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/tmt

PUSHER_APP_ID=
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_CLUSTER=

# Jira (opcjonalnie, ale wymagane dla funkcji "Create Jira issue")
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=
JIRA_ISSUE_TYPE=Task
```

### 3) Uruchom aplikacje

```bash
npm install
npm run seed
npm run dev
```

Nastepnie otworz: `http://localhost:3000`.

### 4) Jak sie zalogowac

1. Wejdz na landing page (`/`).
2. Kliknij **Open App**.
3. Zostaniesz przekierowany do **Clerk Sign In / Sign Up**.
4. Utworz konto (Sign Up) lub zaloguj sie (Sign In).
5. Po sukcesie Clerk przekieruje Cie na `/tmt`.

> Wszystkie trasy i API sa chronione middleware Clerk, wiec bez poprawnych kluczy logowanie i API nie beda dzialac.

## Praca z test case'ami (instrukcja uzytkowa)

Glowne widoki:
- `/tmt` - wykonywanie testow i aktualizacja statusow.
- `/tmt/admin` - zarzadzanie struktura projektu (projekt/modul/sekcja/krok).

### Dodawanie test case'ow

Dodawanie odbywa sie w panelu admina (`/tmt/admin`):

1. Utworz lub wybierz projekt.
2. Dodaj **modul** do projektu.
3. Dodaj **sekcje** do modulu.
4. Dodaj **kroki testowe** (test case steps) do sekcji.

Po zapisie dane sa widoczne w `/tmt`.

### Edycja test case'ow

W `/tmt`:
- **double-click** na tytule/opisie kroku, aby edytowac inline,
- zapisz przyciskiem **Save** lub anuluj **Discard**,
- dla statusu `blocked` mozesz dopisac komentarz (zapis po utracie fokusu).

### Usuwanie test case'ow

Mozesz usuwac elementy na kilku poziomach:

- **krok testowy** - usuniecie pojedynczego kroku z potwierdzeniem dialogowym,
- **sekcja** - usuniecie calej sekcji,
- **modul** - usuniecie calego modulu.

Po usunieciu widok odswieza sie lokalnie i przez Pusher u pozostalych uzytkownikow.

### Zmiana statusow i szybkie akcje

W `/tmt` dla krokow testowych:
- statusy: `untested`, `passed`, `failed`, `blocked`,
- **Quick pass** - hurtowo oznacza cala sekcje jako `passed`,
- **Reset** - przywraca `untested` w sekcji.

### Integracja z Jira (konfiguracja i uzycie)

Aplikacja wspiera tworzenie zgłoszen Jira bezposrednio z kroku testowego (gdy krok jest `failed`/wymaga follow-up).

1. Uzupelnij klucze Jira w `.env.local`:
   - `JIRA_BASE_URL` (np. `https://twoja-firma.atlassian.net`)
   - `JIRA_EMAIL` (email konta technicznego/uzytkownika)
   - `JIRA_API_TOKEN` (token API z Atlassian)
   - `JIRA_PROJECT_KEY` (np. `QA`)
   - `JIRA_ISSUE_TYPE` (np. `Task`, domyslnie `Task`)
2. Uruchom aplikacje ponownie po zmianie env (`npm run dev`).
3. W `/tmt` otworz krok testowy i uzyj akcji tworzenia issue Jira.
4. Po poprawnym utworzeniu, numer i link issue zapisuja sie przy kroku (`jiraIssue`) i synchronizuja realtime.

Dodatkowo w UI jest okno **Manage Jira integration** (ustawienia per-organizacja). Do wlaczenia integracji wymagane sa: Base URL, email, project key oraz token API. Token jest wymagany przynajmniej przy pierwszej aktywacji.

### Dodawanie test case'ow z Excela (`.xlsx` / `.csv`)

Import wykonasz w panelu admina (`/tmt/admin`) w sekcji **Import from Excel**:

1. Przygotuj plik `.xlsx` albo `.csv` z naglowkami kolumn:
   - `projectId`, `projectName`, `moduleId`, `moduleName`,
   - `sectionId`, `sectionName`, `stepId`, `stepTitle`,
   - `stepDescription`,
   - `stepExpectedResults` *(opcjonalne)*.
2. Wybierz organizacje i zaladuj plik przyciskiem **Import**.
3. Aplikacja utworzy lub zaktualizuje projekty i kroki na podstawie danych z pliku.
4. Po imporcie zobaczysz podsumowanie, np. `Imported 2 projects (120 steps)`.

Przyklad jednego wiersza CSV:

```csv
projectId,projectName,moduleId,moduleName,sectionId,sectionName,stepId,stepTitle,stepDescription,stepExpectedResults
web,Web App,auth,Authentication,login,Login flow,login-001,Poprawne logowanie,Uzytkownik loguje sie poprawnym loginem i haslem,Przekierowanie do dashboardu
```

Najczestsze bledy importu:
- brak wymaganej kolumny lub puste pole (np. `stepId`) -> import zwraca blad z numerem wiersza,
- pusty arkusz -> blad `The spreadsheet is empty`,
- niepoprawny format pliku -> blad parsera XLSX/CSV.

### Dobre praktyki dla developera

- Po starcie lokalnym uruchom dwie karty przegladarki i sprawdz realtime (zmiana statusu w jednej karcie powinna byc widoczna w drugiej).
- Po zmianach w schematach danych sprawdz `models/Project.ts` i `models/Run.ts` oraz dopasuj seed (`lib/seed-data.ts`).
- Przy problemach z autoryzacja najpierw sprawdz klucze Clerk i redirect URLs, a nastepnie czy middleware przepuszcza poprawna sesje.

## Model danych i seeding
Struktura danych jest wielopoziomowa: **Project -> Module -> Section -> Step**. Dokumenty MongoDB sa definiowane w `models/Project.ts` oraz `models/Run.ts`.

Skrypt `scripts/seed.ts` wprowadza przykladowy projekt z folderu `lib/seed-data.ts`. Uruchom `npm run seed`, aby zaladowac dane startowe (skrypt nadpisuje wpisy o tych samych ID).

## Funkcjonalnosci aplikacji

### Laboratorium testow (`/tmt`)
- **Wybieranie projektu**: lista rozwijana w topbarze oraz licznik aktywnych widzow (presence Pusher).
- **Wyszukiwanie kontekstowe**: filtruje modul, sekcje i kroki w oparciu o tekst; dziala w czasie rzeczywistym.
- **Panel modulow**: lista z przyciskami duplikacji i usuniecia; klikniecie zmienia aktywny modul.
- **Panel sekcji**: pokazuje badge statusu (agregacja statusow krokow) oraz pasek postepu dla calego modulu.
- **Panel krokow testowych**:
  - statusy: `untested`, `passed`, `failed`, `blocked`; zmiana zapisywana poprzez `/api/runs` z optymistyczna aktualizacja UI,
  - przycisk "Quick pass" masowo ustawia `passed` dla calej sekcji,
  - przycisk "Reset" przywraca `untested`,
  - komentarze dla krokow `blocked` (edycja po double-click, zapis na blur),
  - inline edit tytulu i opisu (double-click, przyciski Save/Discard),
  - alert potwierdzajacy ukonczenie sekcji gdy ostatni krok przejdzie na `passed`,
  - usuwanie pojedynczych krokow z potwierdzeniem dialogowym.
- **Synchronizacja realtime**: statusy i komentarze aktualizuja sie na wszystkich klientach; struktura (projekty/moduly/sekcje) odswieza sie po zmianach wykonanych przez innych uzytkownikow.

### Panel administracyjny (`/tmt/admin`)
- Tworzenie nowych projektow (ID slug + nazwa).
- Dodawanie modulow, sekcji oraz krokow do wybranego projektu.
- Walidacja minimalna (wymagane pola) i komunikaty o niepowodzeniu.
- Po kazdej operacji panel odswieza liste korzystajac z `/api/projects`.

### Dashboard i raporty (`/charts`)
- Pobiera projekty i odpowiadajace im runy, a nastepnie agreguje liczniki statusow.
- Trzy wykresy kolowe (Steps, Sections, Modules) przedstawiaja dystrybucje `passed/failed/blocked/untested`.
- Wskaznik "Aggregating..." widoczny w czasie zbierania danych.

### Uwierzytelnianie i autoryzacja
- Wszystkie trasy (w tym API) chronione przez Clerk (`middleware.ts`).
- Strona glowna (`/`) pokazuje landing page z przyciskiem "Open App" dostepnym po zalogowaniu.

## API (skrocona referencja)
- `GET /api/projects` - lista projektow (wymaga Clerk auth).
- `POST /api/projects/module/clone` - duplikacja modulu w projekcie.
- `DELETE /api/projects/module` - usuniecie modulu.
- `DELETE /api/projects/section` - usuniecie sekcji.
- `PATCH /api/projects/step` - aktualizacja tytulu/opisu kroku.
- `DELETE /api/projects/step` - usuniecie kroku.
- `GET /api/runs` - pobranie stanu krokow dla sekcji.
- `PATCH /api/runs` - zapis statusu i komentarza kroku.
- `POST /api/pusher/auth` - autoryzacja klienta Pusher (kanaly prywatne/presence).
- `POST /api/stripe/checkout` - utworzenie sesji Stripe Checkout dla wybranego planu (wymaga konfiguracji kluczy Stripe).

Kazdy endpoint wymaga poprawnej autoryzacji Clerk; operacje modyfikujace dodatkowo emituja event `structure-updated` lub `step-updated` do kanalu Pusher `presence-tmt`.

## Skrypty npm
- `npm run dev` - tryb developerski (Turbopack).
- `npm run build` - build produkcyjny.
- `npm run start` - start servera produkcyjnego.
- `npm run lint` - eslint.
- `npm run seed` - zaladowanie danych demo do MongoDB.

## Dalsze kroki
- Uzupelnij konfiguracje Clerk (redirect URLs, domeny) oraz Pusher (TLS, region) przed deployem.
- Rozwaz dodanie testow e2e (np. Playwright) dla krytycznych sciezek: zmiana statusu kroku, duplikacja modulu, administracja.
- Przy wdrozeniu produkcyjnym zapewnij monitorowanie procesow realtime oraz replikacje MongoDB.
