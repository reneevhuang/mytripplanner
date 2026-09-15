create extension if not exists pgcrypto;

create type public.hours_parse_status as enum ('parsed', 'unknown', 'unavailable');
create type public.booking_state as enum ('required', 'not_required', 'unknown');
create type public.itinerary_pace as enum ('relaxed', 'balanced', 'full');
create type public.share_access as enum ('read_only');

create table public.places (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  name text not null,
  type text not null,
  city text not null,
  region text not null,
  neighborhood text,
  description text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  hours_raw text,
  hours_status public.hours_parse_status not null default 'unknown',
  duration_minutes integer check (duration_minutes > 0),
  price_range text not null check (price_range in ('€', '€€', '€€€', '€€€€')),
  rating numeric(2,1) not null check (rating between 0 and 5),
  booking_required boolean,
  seasonal_notes text,
  source_record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_label text not null
);

create table public.place_tags (
  place_id uuid not null references public.places(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (place_id, tag_id)
);

create table public.place_hours (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  check (open_time < close_time)
);

create table public.place_import_issues (
  id bigint generated always as identity primary key,
  place_id uuid references public.places(id) on delete cascade,
  source_id text not null,
  severity text not null check (severity in ('warning', 'error')),
  code text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  primary key (user_id, role)
);

create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  day_start time not null,
  day_end time not null,
  pace public.itinerary_pace not null,
  budget text,
  party text not null,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date <= end_date),
  check (day_start < day_end)
);

create table public.itinerary_cities (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  city text not null,
  start_date date not null,
  end_date date not null,
  sort_order integer not null,
  unique (itinerary_id, sort_order),
  check (start_date <= end_date)
);

create table public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  trip_date date not null,
  city text not null,
  notes text not null default '',
  sort_order integer not null,
  unique (itinerary_id, trip_date),
  unique (itinerary_id, sort_order)
);

create table public.itinerary_stops (
  id uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid not null references public.itinerary_days(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  place_snapshot jsonb not null,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  duration_estimated boolean not null default false,
  sort_order integer not null,
  locked boolean not null default false,
  notes text not null default '',
  travel_mode text not null default 'walking' check (travel_mode in ('walking', 'transit', 'driving')),
  conflict_state jsonb not null default '[]'::jsonb,
  unique (itinerary_day_id, sort_order)
);

create table public.itinerary_preferences (
  itinerary_id uuid primary key references public.itineraries(id) on delete cascade,
  interests text[] not null default '{}',
  inputs jsonb not null default '{}'::jsonb
);

create table public.itinerary_shares (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  token_hash text not null unique,
  access public.share_access not null default 'read_only',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index places_city_idx on public.places(city);
create index places_region_idx on public.places(region);
create index places_type_idx on public.places(type);
create index places_rating_idx on public.places(rating desc);
create index itinerary_owner_idx on public.itineraries(owner_id, updated_at desc);
create index share_active_idx on public.itinerary_shares(token_hash) where active;

alter table public.places enable row level security;
alter table public.tags enable row level security;
alter table public.place_tags enable row level security;
alter table public.place_hours enable row level security;
alter table public.place_import_issues enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.itineraries enable row level security;
alter table public.itinerary_cities enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.itinerary_stops enable row level security;
alter table public.itinerary_preferences enable row level security;
alter table public.itinerary_shares enable row level security;

create policy "catalog is publicly readable" on public.places for select using (true);
create policy "tags are publicly readable" on public.tags for select using (true);
create policy "place tags are publicly readable" on public.place_tags for select using (true);
create policy "place hours are publicly readable" on public.place_hours for select using (true);
create policy "profiles are owner readable" on public.profiles for select using (auth.uid() = id);
create policy "profiles are owner writable" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "roles are self readable" on public.user_roles for select using (auth.uid() = user_id);
create policy "itineraries are owner managed" on public.itineraries for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "cities follow itinerary ownership" on public.itinerary_cities for all
  using (exists (select 1 from public.itineraries i where i.id = itinerary_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.itineraries i where i.id = itinerary_id and i.owner_id = auth.uid()));
create policy "days follow itinerary ownership" on public.itinerary_days for all
  using (exists (select 1 from public.itineraries i where i.id = itinerary_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.itineraries i where i.id = itinerary_id and i.owner_id = auth.uid()));
create policy "stops follow itinerary ownership" on public.itinerary_stops for all
  using (exists (
    select 1 from public.itinerary_days d join public.itineraries i on i.id = d.itinerary_id
    where d.id = itinerary_day_id and i.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.itinerary_days d join public.itineraries i on i.id = d.itinerary_id
    where d.id = itinerary_day_id and i.owner_id = auth.uid()
  ));
create policy "preferences follow itinerary ownership" on public.itinerary_preferences for all
  using (exists (select 1 from public.itineraries i where i.id = itinerary_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.itineraries i where i.id = itinerary_id and i.owner_id = auth.uid()));
create policy "shares follow itinerary ownership" on public.itinerary_shares for all
  using (exists (select 1 from public.itineraries i where i.id = itinerary_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.itineraries i where i.id = itinerary_id and i.owner_id = auth.uid()));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') $$;

create policy "admins manage places" on public.places for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage tags" on public.tags for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage place tags" on public.place_tags for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage hours" on public.place_hours for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read import issues" on public.place_import_issues for select using (public.is_admin());
