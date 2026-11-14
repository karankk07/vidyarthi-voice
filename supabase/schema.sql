-- =====================================================================
-- Vidyarthi Voice: database schema and security rules (Supabase / Postgres)
-- Run this whole file once in Supabase > SQL Editor. Then run seed.sql.
--
-- Security model
--   * Only users whose email ends in @email.iimcal.ac.in can sign up or read.
--   * Who raised an issue is never exposed. Reads go through views that
--     drop author ids; writes go through checked functions (RPCs).
--   * Only verified responders of the tagged body (or moderators) can post
--     status updates.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Config ----------------------------------------------------
create or replace function public.allowed_domain() returns text
language sql immutable as $$ select 'email.iimcal.ac.in' $$;

-- ---------- Tables ----------------------------------------------------
create table if not exists public.bodies (
  id    text primary key,
  name  text not null,
  grp   text not null,
  email text
);

-- Who can respond on behalf of a body. Add rows here to verify responders.
create table if not exists public.body_members (
  body_id text not null references public.bodies(id) on delete cascade,
  email   text not null check (email = lower(email)),
  primary key (body_id, email)
);

create table if not exists public.moderators (
  email text primary key check (email = lower(email))
);

create table if not exists public.issues (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid references auth.users(id) on delete set null,
  title             text not null check (char_length(title) between 8 and 120),
  details           text not null check (char_length(details) between 20 and 2000),
  suggested_fix     text not null default '' check (char_length(suggested_fix) <= 1000),
  category          text not null,
  location          text not null default 'Campus-wide',
  frequency         text not null default 'Occasional'
                    check (frequency in ('Daily','Weekly','Monthly','Occasional')),
  body_id           text not null references public.bodies(id),
  status            text not null default 'new'
                    check (status in ('new','acknowledged','taken_up','in_progress','resolved','cant_fix','redirected')),
  hidden            boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  first_response_at timestamptz
);
create index if not exists issues_body_idx on public.issues(body_id);
create index if not exists issues_author_idx on public.issues(author_id);

create table if not exists public.supports (
  issue_id   uuid not null references public.issues(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (issue_id, user_id)
);

create table if not exists public.issue_updates (
  id         uuid primary key default gen_random_uuid(),
  issue_id   uuid not null references public.issues(id) on delete cascade,
  body_id    text not null references public.bodies(id),
  author_id  uuid references auth.users(id) on delete set null,
  status     text not null,
  message    text not null check (char_length(message) between 2 and 1500),
  created_at timestamptz not null default now()
);
create index if not exists updates_issue_idx on public.issue_updates(issue_id);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  issue_id   uuid not null references public.issues(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  body_id    text references public.bodies(id),
  message    text not null check (char_length(message) between 2 and 1000),
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_issue_idx on public.comments(issue_id);

create table if not exists public.confirmations (
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  fixed    boolean not null,
  primary key (issue_id, user_id)
);

create table if not exists public.reports (
  issue_id   uuid not null references public.issues(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  reason     text not null default '',
  created_at timestamptz not null default now(),
  primary key (issue_id, user_id)
);

-- ---------- Helpers ---------------------------------------------------
create or replace function public.my_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_iimc() returns boolean
language sql stable as $$
  select auth.uid() is not null and public.my_email() like '%@' || public.allowed_domain()
$$;

create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from moderators where email = public.my_email())
$$;

create or replace function public.is_responder(b text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from body_members where body_id = b and email = public.my_email())
$$;

-- Block sign-ups from any other domain at the source.
create or replace function public.enforce_domain() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email, '')) not like '%@' || public.allowed_domain() then
    raise exception 'Only % addresses can sign in', public.allowed_domain();
  end if;
  return new;
end $$;
drop trigger if exists enforce_domain on auth.users;
create trigger enforce_domain before insert on auth.users
  for each row execute function public.enforce_domain();

-- ---------- Row level security -----------------------------------------
-- Base tables are locked down. Reads use the views below, writes use RPCs.
alter table public.bodies        enable row level security;
alter table public.body_members  enable row level security;
alter table public.moderators    enable row level security;
alter table public.issues        enable row level security;
alter table public.supports      enable row level security;
alter table public.issue_updates enable row level security;
alter table public.comments      enable row level security;
alter table public.confirmations enable row level security;
alter table public.reports       enable row level security;

drop policy if exists bodies_read on public.bodies;
create policy bodies_read on public.bodies for select to authenticated using (public.is_iimc());

drop policy if exists members_read_own on public.body_members;
create policy members_read_own on public.body_members for select to authenticated
  using (email = public.my_email() or public.is_moderator());

drop policy if exists mods_read_own on public.moderators;
create policy mods_read_own on public.moderators for select to authenticated
  using (email = public.my_email());

-- Supports: a user can add or remove only their own.
drop policy if exists supports_own_read on public.supports;
create policy supports_own_read on public.supports for select to authenticated
  using (user_id = auth.uid());
drop policy if exists supports_own_insert on public.supports;
create policy supports_own_insert on public.supports for insert to authenticated
  with check (public.is_iimc() and user_id = auth.uid());
drop policy if exists supports_own_delete on public.supports;
create policy supports_own_delete on public.supports for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.issues, public.issue_updates, public.comments,
              public.confirmations, public.reports from anon, authenticated;
revoke all on public.bodies, public.body_members, public.moderators, public.supports from anon;
grant select on public.bodies, public.body_members, public.moderators to authenticated;
grant select, insert, delete on public.supports to authenticated;

-- ---------- Read views (no author ids) ---------------------------------
-- These run with the owner's rights, so each one filters by is_iimc() itself.
create or replace view public.issue_feed as
select
  i.id, i.title, i.details, i.suggested_fix, i.category, i.location, i.frequency,
  i.body_id, i.status, i.created_at, i.updated_at, i.first_response_at, i.hidden,
  (select count(*) from supports s where s.issue_id = i.id)::int as support_count,
  (select count(*) from supports s where s.issue_id = i.id
     and s.created_at > now() - interval '7 days')::int as supports_7d,
  (select count(*) from comments c where c.issue_id = i.id and not c.hidden)::int as comment_count,
  (select count(*) from confirmations c where c.issue_id = i.id and c.fixed)::int as confirm_yes,
  (select count(*) from confirmations c where c.issue_id = i.id and not c.fixed)::int as confirm_no,
  (i.author_id = auth.uid()) as is_mine,
  exists (select 1 from supports s where s.issue_id = i.id and s.user_id = auth.uid()) as supported_by_me,
  (select c.fixed from confirmations c where c.issue_id = i.id and c.user_id = auth.uid()) as my_confirmation
from issues i
where public.is_iimc()
  and (not i.hidden or i.author_id = auth.uid() or public.is_moderator());

create or replace view public.update_feed as
select u.id, u.issue_id, u.body_id, u.status, u.message, u.created_at
from issue_updates u
where public.is_iimc();

create or replace view public.comment_feed as
select c.id, c.issue_id, c.body_id, c.message, c.created_at,
       (c.author_id = auth.uid()) as is_mine
from comments c
where public.is_iimc() and not c.hidden;

revoke all on public.issue_feed, public.update_feed, public.comment_feed from anon;
grant select on public.issue_feed, public.update_feed, public.comment_feed to authenticated;

-- ---------- Write functions --------------------------------------------
create or replace function public.create_issue(
  p_title text, p_details text, p_suggested_fix text, p_category text,
  p_location text, p_frequency text, p_body_id text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_iimc() then raise exception 'Sign in with your IIM Calcutta email'; end if;
  if (select count(*) from issues where author_id = auth.uid()
        and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'You can raise up to 5 issues a day. Try supporting an existing one.';
  end if;
  insert into issues (author_id, title, details, suggested_fix, category, location, frequency, body_id)
  values (auth.uid(), trim(p_title), trim(p_details), trim(coalesce(p_suggested_fix, '')),
          p_category, coalesce(p_location, 'Campus-wide'), coalesce(p_frequency, 'Occasional'), p_body_id)
  returning id into v_id;
  insert into supports (issue_id, user_id) values (v_id, auth.uid());
  return v_id;
end $$;

create or replace function public.post_update(
  p_issue uuid, p_as_body text, p_status text, p_message text, p_redirect_to text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_owner text;
begin
  if not public.is_iimc() then raise exception 'Sign in first'; end if;
  select body_id into v_owner from issues where id = p_issue;
  if v_owner is null then raise exception 'Issue not found'; end if;
  if not (public.is_moderator() or (public.is_responder(p_as_body) and p_as_body = v_owner)) then
    raise exception 'Only verified responders for this body can post updates';
  end if;
  if p_status not in ('acknowledged','taken_up','in_progress','resolved','cant_fix','redirected') then
    raise exception 'Invalid status';
  end if;
  if p_status = 'redirected' and (p_redirect_to is null or p_redirect_to = v_owner) then
    raise exception 'Pick the body this should go to';
  end if;
  insert into issue_updates (issue_id, body_id, author_id, status, message)
  values (p_issue, p_as_body, auth.uid(), p_status, trim(p_message));
  update issues set
    status = p_status,
    updated_at = now(),
    first_response_at = coalesce(first_response_at, now()),
    body_id = case when p_status = 'redirected' then p_redirect_to else body_id end
  where id = p_issue;
end $$;

create or replace function public.add_comment(p_issue uuid, p_message text, p_as_body text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_iimc() then raise exception 'Sign in first'; end if;
  if p_as_body is not null and not (public.is_responder(p_as_body) or public.is_moderator()) then
    raise exception 'You are not a verified responder for this body';
  end if;
  if (select count(*) from comments where author_id = auth.uid()
        and created_at > now() - interval '24 hours') >= 30 then
    raise exception 'Daily comment limit reached';
  end if;
  insert into comments (issue_id, author_id, body_id, message)
  values (p_issue, auth.uid(), p_as_body, trim(p_message));
end $$;

create or replace function public.confirm_fix(p_issue uuid, p_fixed boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_iimc() then raise exception 'Sign in first'; end if;
  if (select status from issues where id = p_issue) <> 'resolved' then
    raise exception 'Only resolved issues can be confirmed';
  end if;
  insert into confirmations (issue_id, user_id, fixed) values (p_issue, auth.uid(), p_fixed)
  on conflict (issue_id, user_id) do update set fixed = excluded.fixed;
end $$;

-- Five separate reports hide an issue until a moderator reviews it.
create or replace function public.report_issue(p_issue uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_iimc() then raise exception 'Sign in first'; end if;
  insert into reports (issue_id, user_id, reason) values (p_issue, auth.uid(), left(coalesce(p_reason, ''), 300))
  on conflict do nothing;
  if (select count(*) from reports where issue_id = p_issue) >= 5 then
    update issues set hidden = true where id = p_issue;
  end if;
end $$;

create or replace function public.set_hidden(p_issue uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Moderators only'; end if;
  update issues set hidden = p_hidden where id = p_issue;
  if not p_hidden then delete from reports where issue_id = p_issue; end if;
end $$;

revoke all on function public.create_issue, public.post_update, public.add_comment,
  public.confirm_fix, public.report_issue, public.set_hidden from public, anon;
grant execute on function public.create_issue, public.post_update, public.add_comment,
  public.confirm_fix, public.report_issue, public.set_hidden to authenticated;
