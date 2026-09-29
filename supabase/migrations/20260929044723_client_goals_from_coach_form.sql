-- The goals a client picks are Lucie's form's, decided 29 Sep 2026: prise de
-- masse (the existing 'Build muscle'), perte de gras, recomposition, autre.
-- 'Get stronger', 'Lean out' and 'Move better' stay in the type — an enum
-- value cannot be dropped in place — but neither client offers them again.
alter type public.client_goal add value if not exists 'Lose fat';
alter type public.client_goal add value if not exists 'Recomposition';
alter type public.client_goal add value if not exists 'Other';
