alter table public.itineraries add column if not exists client_id text;
alter table public.itineraries add column if not exists itinerary_payload jsonb not null default '{}'::jsonb;

create unique index if not exists itineraries_owner_client_id_idx
  on public.itineraries(owner_id, client_id)
  where client_id is not null;

