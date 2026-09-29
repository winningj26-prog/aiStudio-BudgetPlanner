-- Link the central account profile to the current Firebase/Google identity.
-- Firebase UIDs are opaque strings and must not be stored in a uuid column.

alter table public.profiles
  add column if not exists firebase_uid text;

create unique index if not exists profiles_firebase_uid_unique
  on public.profiles(firebase_uid)
  where firebase_uid is not null;
