begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

select extensions.has_column('public', 'profiles', 'explore_interests', 'profiles store separate Explore experience preferences');
select extensions.col_not_null('public', 'profiles', 'explore_interests', 'Explore preferences are never null');
select extensions.col_default_is('public', 'profiles', 'explore_interests', '''{}''::text[]', 'Explore preferences default to an empty selection');
select extensions.ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_explore_interests_check'
  ),
  'Explore preferences are constrained to the supported catalogue'
);
select extensions.ok(
  array['dinner-date', 'coffee-date', 'night-date', 'travel-companion', 'bnb-getaway', 'gaming-partner', 'creative-people']::text[]
    <@ array[
      'dinner-date','coffee-date','night-date','movie-night','food-and-cooking',
      'travel-companion','bnb-getaway','weekend-adventure','gaming-partner',
      'creative-people','live-music','art-and-culture','fitness-outdoors',
      'books-and-learning','sports-fans','friends-first'
    ]::text[],
  'Core requested experiences are represented in the catalogue'
);
select extensions.ok(
  array['serious relationship','casual dating','short-term fun']::text[]
    <@ array['serious relationship','casual dating','short-term fun']::text[],
  'Relationship intention labels remain separate from activity preferences'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'Member profile row-level security remains enabled'
);

select * from extensions.finish();
rollback;
