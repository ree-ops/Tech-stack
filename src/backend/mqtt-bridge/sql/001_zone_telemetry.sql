-- Lowveld Grove — telemetry history table
--
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- Every ~30 seconds, the backend logs a snapshot of all four zones here —
-- this is what powers historical trend charts and any future water-usage /
-- ROI reporting, since the in-memory prediction history only keeps the last
-- ~10 minutes.

create table if not exists zone_telemetry (
  id bigint generated always as identity primary key,
  zone_id text not null,
  label text not null,
  soil_moisture numeric not null,
  canopy_temp numeric not null,
  actuator_on boolean not null,
  pump_on boolean not null,
  stress_code text not null,
  hours_to_critical numeric,
  moisture_rate_pct_per_hr numeric,
  temp_rate_c_per_hr numeric,
  recorded_at timestamptz not null default now()
);

-- Speeds up "history for this zone, most recent first" queries.
create index if not exists idx_zone_telemetry_zone_recorded
  on zone_telemetry (zone_id, recorded_at desc);

alter table zone_telemetry enable row level security;

-- The backend writes using the publishable key, which Postgres evaluates as
-- the `anon` role — so it needs an explicit insert policy.
create policy "Allow inserts from the backend"
  on zone_telemetry
  for insert
  to anon
  with check (true);

-- Also readable by the same key — this is what a future history-chart
-- feature (or just checking the data landed) will query with. No
-- update/delete policy: history is append-only.
create policy "Allow reads"
  on zone_telemetry
  for select
  to anon
  using (true);
