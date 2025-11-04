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

# Stripe (opcjonalnie dla płatnych planów)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_PRICE_BASIC_MONTHLY=
STRIPE_PRICE_BASIC_YEARLY=
STRIPE_PRICE_BUSINESS_MONTHLY=
STRIPE_PRICE_BUSINESS_YEARLY=
STRIPE_PRICE_ENTERPRISE_MONTHLY=
STRIPE_PRICE_ENTERPRISE_YEARLY=
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
