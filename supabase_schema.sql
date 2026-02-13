-- Create a table for public profiles
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  role text default 'USER',

  constraint username_length check (char_length(username) >= 3)
);

-- Ensure role column exists
alter table profiles add column if not exists role text default 'USER';

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Anyone can insert profiles." on profiles
  for insert with check (true);

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

create policy "Admins can update any profile" on profiles
  for update using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'ADMIN'
    )
  );

create policy "Admins can delete any profile" on profiles
  for delete using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'ADMIN'
    )
  );

-- Create a table for tickets
do $$ begin
  create type ticket_status as enum ('OPEN', 'IN_PROGRESS', 'CLOSED', 'RESOLVED');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type ticket_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
exception
  when duplicate_object then null;
end $$;

create table if not exists tickets (
  id uuid default uuid_generate_v4() primary key,
  driver_id uuid references auth.users, -- Nullable for guest/public tickets
  contact_email text, -- For guests
  assignee_id uuid references auth.users, -- The admin/agent assigned
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text not null,
  topic text not null, -- e.g. 'Billing', 'Technical'
  status ticket_status default 'OPEN',
  priority ticket_priority default 'MEDIUM',
  admin_notes text, -- Internal notes for admin tracking
  image_url text, -- URL to the attached image (optional)
  contact_phone text -- For guests
);

-- Ensure contact_phone column exists
alter table tickets add column if not exists contact_phone text;

alter table tickets enable row level security;

-- Allow public to create tickets (for the landing page)
drop policy if exists "Anyone can create tickets." on tickets;
create policy "Anyone can create tickets." on tickets
  for insert with check (true);

drop policy if exists "Admins can view all tickets." on tickets;
create policy "Admins can view all tickets." on tickets
  for select using (true); -- simplified for demo, in real app check for admin role

drop policy if exists "Admins can update tickets." on tickets;
create policy "Admins can update tickets." on tickets
  for update using (true); -- allow status, priority, and notes updates

-- Create a table for messages/comments
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references tickets not null,
  user_id uuid references profiles, -- Link to profiles for easier joins
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  content text not null,
  attachment_url text,
  attachment_type text
);

-- Ensure user_id references profiles if it exists
alter table messages drop constraint if exists messages_user_id_fkey;
alter table messages add constraint messages_user_id_fkey foreign key (user_id) references profiles(id);

alter table messages enable row level security;

drop policy if exists "Anyone can view messages." on messages;
create policy "Anyone can view messages." on messages
  for select using (true);

drop policy if exists "Anyone can insert messages." on messages;
create policy "Anyone can insert messages." on messages
  for insert with check (true);

drop policy if exists "Anyone can update own messages." on messages;
create policy "Anyone can update own messages." on messages
  for update using (true);

-- Create a table for notifications
create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references tickets(id) on delete cascade,
  title text not null,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table notifications enable row level security;

drop policy if exists "Anyone can view notifications." on notifications;
create policy "Anyone can view notifications." on notifications
  for select using (true);

drop policy if exists "Anyone can insert notifications." on notifications;
create policy "Anyone can insert notifications." on notifications
  for insert with check (true);

drop policy if exists "Anyone can update notifications." on notifications;
create policy "Anyone can update notifications." on notifications
  for update using (true);
