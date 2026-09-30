-- Ensure toolkit profiles receive a UUID when created by the trusted account bridge.
-- This keeps the database schema aligned with the other UUID-backed account tables.

alter table public.profiles
  alter column id set default gen_random_uuid();
