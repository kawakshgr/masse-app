-- The prototype's check-in is a comparison, not a gallery: three named poses,
-- shown against a baseline, beside measurements that carry their own change.

create type public.photo_pose as enum ('front', 'side', 'back');

alter table public.check_in_photos
  add column pose public.photo_pose not null default 'front';

-- One photo per pose per check-in: the design has three slots, not a pile.
-- Existing rows keep 'front', and a replacement overwrites rather than stacks.
create unique index check_in_photos_one_per_pose
  on public.check_in_photos (check_in_id, pose);

-- Measurements belong to the week they were taken, which is the check-in.
alter table public.check_ins
  add column waist_cm  numeric(5,1),
  add column chest_cm  numeric(5,1),
  add column hips_cm   numeric(5,1),
  add column thigh_cm  numeric(5,1);

comment on column public.check_ins.waist_cm is
  'Body measurements ride on the weekly check-in so a delta is one row apart.';
