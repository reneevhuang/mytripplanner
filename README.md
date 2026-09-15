# MyTripPlanner

A mobile-first Italy catalog and deterministic itinerary planner built with Next.js and TypeScript.

## Included

- Searchable, sortable, responsive catalog sourced from `italy.json`
- Place details with explicit unknown hours, durations, and booking states
- Multi-city/date trip setup with interests, budget, pace, party, and daily windows
- Deterministic planner with scoring, geographic grouping, duration fitting, booking/seasonal warnings, duplicate prevention, and transparent travel estimates
- Editable schedules with time changes, keyboard reorder controls, locking, removal, notes, local autosave-ready persistence, and read-only share links
- Print/PDF layout and timezone-aware `.ics` export
- Supabase schema/RLS foundation and validated import tooling
- Health endpoint, AWS Amplify build configuration, and optional standalone Docker build

The later plan phases—authenticated cloud sync, server-backed revocable shares, admin CRUD, and optional AI refinement—have provider/data boundaries but are intentionally not enabled without production credentials and authorization.

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run validate:data
npm run dev
```

Open `http://localhost:3000`. The app works without external credentials and uses `italy.json` plus browser local storage.

### Enable account sync and server-backed shares

Create a Supabase project, then configure both public browser credentials and the private service role key:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Apply all migrations under `supabase\migrations`, including `202609150001_itinerary_payload.sql`. In Supabase Auth, add the local and production callback URLs:

```text
http://localhost:3000/auth/callback
https://your-amplify-domain/auth/callback
```

When these values are present, the catalog loads from Supabase, users can sign in with magic links, authenticated trips autosave to the account, local guest trips can be imported, and share links use server-side token records. Without Supabase configuration, the app stays usable in guest mode with local device saves and local read-only share links.

### Enable real travel times

The routing adapter uses Amazon Location Service Routes. For local development, configure AWS CLI credentials with permission to call `geo-routes:CalculateRoutes`:

```powershell
aws configure
```

Set the region in `.env.local`:

```text
AMAZON_LOCATION_REGION=us-west-2
```

Alternatively, create an Amazon Location API key and set `AWS_LOCATION_API_KEY` for local development. Do not expose the key through a `NEXT_PUBLIC_` variable. Restart `npm run dev` after changing credentials. New itineraries will use Amazon Location walking routes; if AWS credentials, permissions, or routing are unavailable, the planner preserves the valid itinerary and explicitly labels straight-line estimates.

## Validation

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Catalog import

1. Create a Supabase project.
2. Apply all SQL files in `supabase\migrations`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the current shell.
4. Run:

```powershell
npm run validate:data
npx tsx scripts\import-italy.ts
```

The importer preserves each original record in `places.source_record`, normalizes tags and hours status, rejects invalid required fields, and retains nullable optional values. Validation reports uncertain hours/durations/bookings and coordinate outliers instead of silently changing them.

The importer also populates tag links and import warnings. Re-running it is idempotent for places, tags, and links; review or clear prior warning rows before repeated production imports if a single current issue set is required. The service role key is server-only and must never use a `NEXT_PUBLIC_` prefix.

## Planner behavior

- Rating, matching interests, and budget fit raise a place's score.
- Booking requirements and uncertain fields apply small penalties but do not remove a place.
- Missing durations use a documented 75-minute estimate and receive a warning.
- Only simple all-day hour ranges are treated as confidently parsed. Other text remains unverified.
- Stops are geographically ordered after scoring.
- Straight-line travel estimates are labeled as estimates; `MapProvider` replaces them with Amazon Location results when AWS is configured.
- A place is never scheduled twice in one generated itinerary.

## AWS Amplify deployment

AWS Amplify Hosting supports the Next.js App Router, server rendering, and route handlers used by this application. The included `amplify.yml` runs the production build.

1. Push the project to a GitHub repository.
2. In AWS Amplify Hosting, choose **Create new app** and connect the repository and production branch.
3. Confirm Amplify detects Next.js and the checked-in `amplify.yml`.
4. Create an IAM policy named `MyTripPlannerRoutes`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "geo-routes:CalculateRoutes",
      "Resource": "*"
    }
  ]
}
```

5. Create an IAM role with this trust policy and attach `MyTripPlannerRoutes`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "amplify.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

6. In Amplify, open **App settings → IAM roles → Compute role** and assign the role.
7. Add `AMAZON_LOCATION_REGION`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as Amplify environment variables. Use a region where Amazon Location Routes is available. Do not use an `AWS_` prefix for custom Amplify environment variables because that prefix is reserved.
8. Deploy, then verify `/api/health` and generate a trip to confirm gaps are labeled **Amazon Location route**.

The Amplify SSR Compute role supplies temporary credentials at runtime. Do not store long-lived AWS access keys in Amplify environment variables.

## Security notes

- Supabase RLS is enabled for every table in the initial schema.
- User itinerary records are owner-scoped; catalog mutation is admin-only.
- Guest share links in the credential-free local build embed a read-only snapshot in the URL fragment, which is not sent to the server. Do not put private notes in a link you distribute.
- Production shares should store only a hash of a high-entropy token and expose a deliberate read-only projection.
- Notes are escaped in calendar output. React escapes rendered notes by default.
