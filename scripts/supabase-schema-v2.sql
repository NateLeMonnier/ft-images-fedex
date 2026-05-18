-- PhotoTree Schema v2: centralized photo storage
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Photos table
create table photos (
  id uuid default gen_random_uuid() primary key,
  filename text unique not null,
  storage_path text not null,
  date text,
  location text,
  description text,
  width integer,
  height integer,
  camera_model text,
  uploaded_at timestamptz default now()
);

-- 2. Junction table: which people appear in which photos
create table photo_people (
  photo_id uuid references photos(id) on delete cascade,
  person_id text not null,
  primary key (photo_id, person_id)
);

-- 3. RLS policies (public read/write for prototype)
alter table photos enable row level security;
alter table photo_people enable row level security;

create policy "Allow public read" on photos for select using (true);
create policy "Allow public insert" on photos for insert with check (true);
create policy "Allow public update" on photos for update using (true);

create policy "Allow public read" on photo_people for select using (true);
create policy "Allow public insert" on photo_people for insert with check (true);
create policy "Allow public delete" on photo_people for delete using (true);

-- 4. Create storage bucket for photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true);

-- 5. Storage policies: public read, anon upload
create policy "Public read photos" on storage.objects
  for select using (bucket_id = 'photos');

create policy "Allow uploads" on storage.objects
  for insert with check (bucket_id = 'photos');

create policy "Allow updates" on storage.objects
  for update using (bucket_id = 'photos');
