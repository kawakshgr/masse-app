-- "Au repas" is not a time of day. A coach writing a protocol says matin, midi,
-- collation, soir — so the vocabulary has to carry those, not approximate them.
--
-- 'meal' stays: several built-ins are fat-soluble and genuinely mean "with
-- food", whichever meal that is. 'pre' and 'post' stay for the same reason —
-- they are tied to the session, not to the clock.

alter table public.supplements
  drop constraint supplements_timing_known;

alter table public.supplements
  add constraint supplements_timing_known
    check (timing in ('anytime', 'morning', 'noon', 'snack', 'pre', 'post',
                      'meal', 'evening'));

alter table public.client_supplements
  drop constraint client_supplements_timing_known;

alter table public.client_supplements
  add constraint client_supplements_timing_known
    check (timing in ('anytime', 'morning', 'noon', 'snack', 'pre', 'post',
                      'meal', 'evening'));
