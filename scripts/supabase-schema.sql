-- Person overrides: stores user-editable fields for each person
create table person_overrides (
  person_id text primary key,
  primary_photo text,
  birth_date text,
  birth_location text,
  notes text,
  updated_at timestamptz default now()
);

-- Photo metadata: stores date, location, description for each photo
create table photo_metadata (
  photo_key text primary key,
  date text,
  location text,
  description text,
  updated_at timestamptz default now()
);

-- Allow public read/write for now (no auth in prototype)
alter table person_overrides enable row level security;
alter table photo_metadata enable row level security;

create policy "Allow public read" on person_overrides for select using (true);
create policy "Allow public insert" on person_overrides for insert with check (true);
create policy "Allow public update" on person_overrides for update using (true);

create policy "Allow public read" on photo_metadata for select using (true);
create policy "Allow public insert" on photo_metadata for insert with check (true);
create policy "Allow public update" on photo_metadata for update using (true);
