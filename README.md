# TMT (Test Management Tool)

## Wymagania wstepne
- Node.js >= 18.18 (zalecane 20.x)
- npm >= 10 (lub pnpm/bun jesli preferujesz)
- Dostepna baza danych MongoDB
- Konfiguracja Clerk (klucze publiczne i secret) oraz Pusher (do synchronizacji realtime)

## Konfiguracja srodowiska
1. Utworz plik `.env.local` w katalogu glownym projektu.
2. Uzupelnij go zgodnie z ponizszym schematem.

```ini
# Baza danych
MONGODB_URI=

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

# Integracje issue trackerow konfiguruje sie w UI per organizacja
```

> Aplikacja korzysta z autoryzacji Clerk dla wszystkich tras (patrz `middleware.ts`). Brak poprawnej konfiguracji Clerk lub Pusher spowoduje brak dostepu do glownego UI lub wylaczenie funkcji czasu rzeczywistego.

## Instalacja i uruchomienie
```bash
npm install
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

# Jira/ClickUp konfiguruje sie w `/tmt` w ustawieniach integracji organizacji
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

### Integracje Jira / ClickUp (konfiguracja i uzycie)

Aplikacja wspiera tworzenie zadan w Jira albo ClickUp bezposrednio z kroku testowego (gdy krok jest `failed`/wymaga follow-up). Organizacja moze miec aktywna jedna opcje: brak integracji, Jira albo ClickUp.

1. W `/tmt` kliknij badge integracji w prawym gornym rogu.
2. Wybierz **No integration**, **Jira** albo **ClickUp**.
3. Dla Jira uzupelnij:
   - Base URL (np. `https://twoja-firma.atlassian.net`)
   - Email
   - Project key (np. `QA`)
   - Issue type (np. `Task`)
   - API token
4. Dla ClickUp uzupelnij:
   - List ID
   - Status (opcjonalnie, np. `to do`)
   - API token (`pk_...`)
5. W `/tmt` otworz krok testowy ze statusem `failed` i uzyj akcji tworzenia zadania.
6. Po poprawnym utworzeniu, numer i link zadania zapisuja sie przy kroku (`externalTask`) i synchronizuja realtime.

Istniejace rekordy Jira zapisane jako `jiraIssue` nadal sa odczytywane. Nowe eskalacje zapisuja neutralne pole `externalTask`; dla Jiry aplikacja dodatkowo wypelnia `jiraIssue` dla kompatybilnosci.

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


Najczestsze bledy importu:
- brak wymaganej kolumny lub puste pole (np. `stepId`) -> import zwraca blad z numerem wiersza,
- pusty arkusz -> blad `The spreadsheet is empty`,
- niepoprawny format pliku -> blad parsera XLSX/CSV.

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


# Test Management Tool

Open-source test management system.

Author: Kacper Jozwik

License: GNU Affero General Public License v3.0
