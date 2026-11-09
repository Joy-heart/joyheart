-- JoyHeart Explore: separate date and shared-experience preferences from
-- relationship intention. Existing profiles and relationship intentions
-- are preserved.
alter table public.profiles
  add column if not exists explore_interests text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_explore_interests_check;

alter table public.profiles
  add constraint profiles_explore_interests_check
  check (
    cardinality(explore_interests) <= 20
    and explore_interests <@ array[
      'dinner-date',
      'coffee-date',
      'night-date',
      'movie-night',
      'food-and-cooking',
      'travel-companion',
      'bnb-getaway',
      'weekend-adventure',
      'gaming-partner',
      'creative-people',
      'live-music',
      'art-and-culture',
      'fitness-outdoors',
      'books-and-learning',
      'sports-fans',
      'friends-first'
    ]::text[]
  );

comment on column public.profiles.explore_interests is
  'Member-selected JoyHeart Explore experiences; separate from relationship intention and private until shared by the member.';
