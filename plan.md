# Italy Itinerary Website Implementation Plan

## Problem and proposed approach

Build a new mobile-first, professional travel-planning website from the existing `italy.json`. The site will expose the place catalog as a searchable/filterable table with details and an optional location panel, collect trip dates and traveler preferences, generate a multi-day itinerary, and let users manually edit, save, share, print, export, and later sync plans to an account.

The project is greenfield: the workspace currently contains only `italy.json`. Use Next.js with TypeScript, Supabase for persistent catalog/account data, Amazon Location Service behind an adapter, and AWS Amplify Hosting for the live application. Keep itinerary generation deterministic and testable through a rule-based planning engine; place optional AI refinement behind a provider-neutral interface so AI failure never invalidates the base itinerary.

## Confirmed product decisions

- **Core experience:** browse/filter places, open details, build a dated multi-city itinerary, reorder stops, auto-plan, view maps, and save.
- **Trip inputs:** name, start/end dates, cities, dates/days per city, daily start/end times, interests, budget, pace, and travel party.
- **Planning rules:** preference matching, duration fitting, opening-hour checks where confidently parseable, geographic grouping, meal timing, booking warnings, city/date allocation, duplicate prevention, and day/trip regeneration.
- **Planner architecture:** hybrid, with a complete rule-based result first and optional AI refinement second; retry AI once, then preserve the rule-based result with a notice.
- **Persistence:** guest itineraries in browser storage, with optional Supabase magic-link accounts that can sync/import guest plans.
- **Catalog management:** import `italy.json` into Supabase and provide a role-protected admin interface.
- **Map/routing:** Amazon Location Service Routes, supporting walking, transit, and driving where the provider supports the requested mode.
- **Browse UI:** table-primary layout with a secondary map panel.
- **Visible columns:** name, city, region, neighborhood, type, tags, rating, price, duration, hours, and booking requirement.
- **Filters:** text, city/region, type, tags, minimum rating, price, maximum duration, and booking requirement.
- **Editing:** drag within/between days, set times, remove/replace/lock stops, notes, and travel gaps. Conflicts warn but do not block edits.
- **Sharing/export:** unlisted read-only live links, print view, PDF, and `.ics` calendar download. PDF includes schedule, place details, booking/seasonal warnings, and notes, but not maps.
- **Design:** minimal, presentable, professional, and mobile-first.
- **Quality:** WCAG 2.2 AA, keyboard alternatives to drag/drop, strong loading performance, SEO for public pages, production error monitoring, and comprehensive automated tests.
- **Delivery:** phased. The first live milestone includes catalog, trip setup, rule planner, manual editor, guest saves, sharing, print/PDF, and calendar export.

## Current data assessment

`italy.json` contains 103 records across 16 cities and 5 regions. Each record is intended to contain:

`id`, `name`, `type`, `city`, `region`, `neighborhood`, `description`, `latitude`, `longitude`, `hours`, `duration_minutes`, `price_range`, `rating`, `tags`, `seasonal_notes`, and `booking_required`.

Known import concerns that must be handled explicitly:

- No duplicate IDs were detected.
- `hours` is null for 33 records and otherwise mixes structured-looking ranges with free text.
- `duration_minutes` is null for 9 records.
- `neighborhood` is null for 19 records.
- `seasonal_notes` is null for 87 records.
- `booking_required` is null for 1 record and must not be silently treated as `false`.
- Tags contain inconsistent spellings such as `local-favorite` and `local_favorite`.
- Coordinates require geographic validation; at least one record appears suspicious for its stated city and should be flagged by import checks rather than silently corrected.
- Durations range from 15 to 480 minutes, ratings from 2.1 to 5.0, and prices from `€` to `€€€€`.

The import must retain raw source values, produce normalized fields for application logic, and fail on invalid required fields. Ambiguous optional fields should be represented as unknown rather than guessed.

## Architecture

### Application

- Next.js App Router with TypeScript and strict type checking.
- Server Components for initial catalog/public-share rendering; Client Components only for interactive filters, maps, drag/drop, and local drafts.
- Route handlers/server actions for privileged operations, share/export generation, routing requests, and future AI refinement.
- A small component system using accessible primitives and CSS variables for a restrained professional theme.
- AWS Amplify Hosting deployment with managed Next.js SSR compute, environment settings, health checks, IAM roles, and CloudWatch logging.

### Data and authentication

- Supabase PostgreSQL as the source of truth for places, normalized tags/hours, user itineraries, shares, profiles, and roles.
- Supabase Auth magic-link sign-in.
- Row Level Security on every user-owned table.
- Public catalog reads through a restricted view or policy; admin writes require an explicit admin role.
- Guest itineraries use a versioned local-storage schema and can be imported into an authenticated account with idempotent migration.
- Unlisted share links use high-entropy tokens and expose a read-only projection, never owner/private metadata.

### Provider boundaries

- `MapProvider` interface for map rendering and route estimates; first adapter uses Amazon Location Service Routes.
- Route calls happen server-side when credentials or abuse controls require it, with caching and rate limiting.
- `ItineraryRefiner` interface for optional AI providers. It accepts a validated rule-based plan and returns a constrained patch, not an unrestricted replacement.
- Provider failures return typed errors and preserve the valid local plan.

## Proposed project structure

```text
app/
  page.tsx
  places/[id]/page.tsx
  plan/page.tsx
  itineraries/[id]/page.tsx
  share/[token]/page.tsx
  auth/callback/route.ts
  admin/places/page.tsx
  api/routes/route.ts
  api/itineraries/refine/route.ts
  api/exports/ics/route.ts
components/
  catalog/
  itinerary/
  map/
  trip-setup/
  exports/
lib/
  catalog/
    schema.ts
    normalize.ts
    hours.ts
    repository.ts
  planner/
    types.ts
    scoring.ts
    scheduling.ts
    proximity.ts
    conflicts.ts
    generate.ts
  persistence/
    guest-store.ts
    itinerary-repository.ts
    migrate-guest.ts
  providers/
    maps/
    ai/
  supabase/
  exports/
supabase/
  migrations/
  seed/
scripts/
  validate-italy.ts
  import-italy.ts
tests/
  unit/
  integration/
  e2e/
italy.json
```

Exact names may be adjusted to match generated framework conventions, but the boundaries between catalog, planner, persistence, providers, and UI should remain.

## Data model

### Catalog tables

- `places`: stable source ID, descriptive fields, coordinates, price/rating, nullable duration, raw hours text, parsed-hours status, booking tri-state, source metadata, and timestamps.
- `tags`: canonical tag slug and display label.
- `place_tags`: many-to-many relation.
- `place_hours`: normalized day/time intervals only when parsing is confident; retain `hours_raw` on `places`.
- Optional `place_import_issues`: warnings such as suspicious coordinates, unknown hours syntax, missing durations, and unresolved booking state.

### User and itinerary tables

- `profiles`: auth user ID and display preferences.
- `user_roles`: role assignment with `admin` separated from general profile data.
- `itineraries`: owner, trip metadata, dates, pace, budget, party, revision/version, and timestamps.
- `itinerary_cities`: date/day allocation per city.
- `itinerary_days`: date, city, daily time window, notes, and ordering.
- `itinerary_stops`: place reference or custom snapshot, start time, duration, order, lock state, notes, travel mode, and conflict state.
- `itinerary_preferences`: normalized selected tags/interests and planning inputs.
- `itinerary_shares`: high-entropy token hash, itinerary ID, access mode, active/revoked state, and timestamps.

Use foreign keys, check constraints, optimistic version columns, indexes for catalog filters and itinerary ownership, and RLS policies tested as part of integration coverage.

## Planner design

1. Validate trip dates, city allocations, daily windows, and preference inputs.
2. Build an eligible place pool by city/date and hard constraints.
3. Score places using normalized rating, interest/tag overlap, budget match, travel-party suitability, pace, booking requirements, and diversity penalties.
4. Seed meal windows with restaurant/cafe candidates when suitable.
5. Cluster remaining candidates geographically using coordinates.
6. Schedule candidates into open time slots using duration and confident hours constraints.
7. Treat missing duration/hours as explicit uncertainty: use a documented fallback duration only for planning, label it as estimated, and avoid claiming hours compatibility.
8. Add travel gaps from cached Amazon Location estimates when available; use a clearly labeled straight-line heuristic fallback when routing is unavailable.
9. Emit warnings for booking needs, seasonal notes, uncertain hours/duration, route fallback, and day overflow.
10. Preserve locked/manual stops during regeneration and only replace unlocked generated stops.
11. Run a final invariant check: valid dates/cities, no duplicate place IDs, stable ordering, no negative gaps, and all conflicts represented to the UI.
12. Optionally pass the validated plan to `ItineraryRefiner`; accept only schema-valid, bounded changes that still pass planner invariants.

All planner weights and fallback durations should be named configuration values with deterministic tests.

## User experience flows

### Catalog

- Landing page introduces the planner and loads the place table.
- Search/filter/sort state is encoded in the URL where practical.
- Selecting a row opens a detail page or accessible panel with description, location, tags, hours, seasonal notes, booking status, and add-to-trip action.
- The map panel loads on demand and synchronizes selected/filtered places without blocking the table.
- Mobile uses a compact card/table hybrid and a full-screen secondary map.

### Trip setup and generation

- A guided form collects trip basics, city/date allocation, daily hours, interests, budget, pace, and party.
- Inline validation prevents impossible date/city allocations.
- Generation displays progress without implying AI is required.
- Results open in a day-by-day editor with warnings and map context.

### Editing

- Pointer drag/drop plus keyboard move controls.
- Moving or retiming a stop recalculates warnings and travel gaps.
- Conflicts are visible and announced accessibly but do not block saving.
- Lock, replace, remove, notes, and regeneration actions include undo where practical.

### Guest persistence

- Drafts autosave locally using a versioned schema.
- Users can name, duplicate, delete, and reopen local itineraries.
- Storage failures are surfaced; no success-shaped fallback.

### Sharing and exports

- First milestone supports an unlisted read-only live link backed by a server-side share record.
- Print uses dedicated print CSS.
- PDF is generated from the print-oriented document so print and PDF content stay consistent.
- `.ics` export creates one event per scheduled stop with local Italy time zone information, description, booking warnings, and coordinates.

## Delivery phases

### Phase 1: Foundation and validated catalog

- Scaffold Next.js/TypeScript, linting, formatting, test runners, environment validation, and accessible UI foundations.
- Define the catalog schema and import-normalization pipeline.
- Add Supabase migrations, seed/import tooling, RLS baseline, and catalog repository.
- Build the table, filters, sorting, details, URL state, responsive behavior, and lazy map panel.
- Add AWS Amplify deployment configuration and basic monitoring.

### Phase 2: Production MVP itinerary experience

- Build trip setup and city/date allocation.
- Implement and test the deterministic rule planner.
- Build day-by-day editing, keyboard reordering, conflict warnings, locking, replacement, notes, and route gaps.
- Add versioned guest autosave and itinerary management.
- Add share records/read-only links, print/PDF, and `.ics` export.
- Complete accessibility, responsive, performance, SEO, and end-to-end validation.

### Phase 3: Accounts and synchronization

- Add Supabase magic-link auth and callback flow.
- Add private cloud itinerary CRUD with RLS and optimistic concurrency.
- Implement explicit guest-to-account import/sync and conflict handling.
- Add account itinerary management and share revocation.

### Phase 4: Admin catalog management

- Add role-based authorization and audit-friendly admin CRUD.
- Reuse catalog validation/normalization on all writes.
- Add import preview, validation issue reporting, and safe bulk re-import.
- Ensure catalog edits do not corrupt historical itinerary snapshots.

### Phase 5: Optional AI refinement

- Implement the provider-neutral refiner contract and one configured provider.
- Send only necessary itinerary/place data and keep secrets server-side.
- Validate structured output, constrain allowed mutations, retry once, and fall back to the rule plan with a notice.
- Add cost, timeout, observability, and abuse controls.

## Testing and verification

- **Unit:** schema validation, normalization, tag aliases, hours parsing, scoring, clustering, scheduling, conflict detection, regeneration, locked stops, route fallbacks, local storage migrations, and export formatting.
- **Property/invariant tests:** generated plans never duplicate a place, leave the requested date range, cross assigned cities, or silently drop conflicts.
- **Integration:** Supabase repositories, RLS ownership/admin policies, share-token access, guest import idempotency, Amazon Location adapter failures, and AI adapter validation/fallback.
- **Component/accessibility:** filters, dialogs/panels, forms, warnings, table/card responsiveness, and keyboard reorder controls.
- **End-to-end:** browse/filter/detail, create/generate/edit/reload guest itinerary, share read-only link, print/PDF, `.ics`, magic-link account migration, and admin authorization.
- **Performance:** keep the catalog usable before map code loads, virtualize only if measurements require it, cache route estimates, and test mobile loading behavior.
- **Security:** validate server inputs, enforce RLS, avoid exposing service-role or provider secrets, rate-limit share/routing/refinement endpoints, sanitize notes for exports, and make share tokens revocable.

## Documentation and operations

- README with local setup, Supabase setup/migrations, AWS credentials/IAM roles, Amplify Hosting deployment, environment variables, and test commands.
- `.env.example` with public/private variable separation and no secrets.
- Catalog import guide documenting normalization, rejected records, warnings, and how to update `italy.json`.
- Planner behavior document describing weights, fallback durations, hours limitations, route fallback, and AI boundaries.
- Admin and sharing security notes.
- CI pipeline for type-check, lint, unit/integration tests, production build, migration checks, and selected end-to-end tests.

## Important considerations

- Opening hours are free-form and cannot always be safely interpreted. Never convert ambiguity into a false guarantee that a place is open.
- The catalog is small enough for simple server-side retrieval and client-side filtering initially, but database queries and indexes should remain ready for growth.
- Transit routing availability and behavior must be verified against the selected Amazon Location Routes API and region; isolate it behind the adapter.
- Use the current Amazon Location Service Routes v2 API through the AWS SDK for JavaScript v3.
- Public shares expose only a deliberate read-only projection and should not reveal account email, internal IDs, or private drafts.
- Historical itinerary stops should retain a display snapshot so later catalog edits do not unexpectedly rewrite a saved trip.
- AI is not part of the correctness path. A valid rule-based itinerary is always created first and remains available.
