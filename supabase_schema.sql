-- Create a table for public profiles
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for tickets
create type ticket_status as enum ('OPEN', 'IN_PROGRESS', 'CLOSED', 'RESOLVED');
create type ticket_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

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
  image_url text -- URL to the attached image (optional)
);

alter table tickets enable row level security;

-- Allow public to create tickets (for the landing page)
create policy "Anyone can create tickets." on tickets
  for insert with check (true);

create policy "Admins can view all tickets." on tickets
  for select using (true); -- simplified for demo, in real app check for admin role

create policy "Admins can update tickets." on tickets
  for update using (true); -- allow status, priority, and notes updates

-- Create a table for messages/comments
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references tickets not null,
  user_id uuid references auth.users, -- Nullable if we allow guest comments
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  content text not null
);

alter table messages enable row level security;

create policy "Anyone can view messages." on messages
  for select using (true);

create policy "Anyone can insert messages." on messages
  for insert with check (true);

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

create policy "Anyone can view notifications." on notifications
  for select using (true);

create policy "Anyone can insert notifications." on notifications
  for insert with check (true);

create policy "Anyone can update notifications." on notifications
  for update using (true);
