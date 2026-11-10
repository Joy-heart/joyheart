-- JoyHeart matching engine stage 1: private candidate eligibility and ranking.
-- No public discovery page is enabled by this migration. Both members must opt in.
create or replace function private.joyheart_can_discover_pair(p_actor uuid, p_candidate uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select p_actor is not null and p_candidate is not null and p_actor <> p_candidate
 and private.joyheart_is_match_eligible(p_actor)
 and private.joyheart_is_match_eligible(p_candidate)
 and exists (
   select 1 from public.profiles a
   join public.profiles c on c.user_id = p_candidate
   join public.member_discovery_preferences ap on ap.user_id = a.user_id
   join public.member_discovery_preferences cp on cp.user_id = c.user_id
   where a.user_id = p_actor
   and ap.discovery_enabled and cp.discovery_enabled
   and c.age between ap.preferred_age_min and ap.preferred_age_max
   and a.age between cp.preferred_age_min and cp.preferred_age_max
   and (cardinality(ap.preferred_countries)=0 or exists(select 1 from unnest(ap.preferred_countries) x where lower(x)=lower(c.country)))
   and (cardinality(cp.preferred_countries)=0 or exists(select 1 from unnest(cp.preferred_countries) x where lower(x)=lower(a.country)))
   and (cardinality(ap.relationship_intentions)=0 or c.relationship_intention=any(ap.relationship_intentions))
   and (cardinality(cp.relationship_intentions)=0 or a.relationship_intention=any(cp.relationship_intentions))
   and private.joyheart_preference_accepts(a.seeking,c.gender)
   and private.joyheart_preference_accepts(c.seeking,a.gender)
   and not exists(select 1 from public.profile_blocks b where (b.blocker_id=p_actor and b.blocked_id=p_candidate) or (b.blocker_id=p_candidate and b.blocked_id=p_actor))
   and not exists(select 1 from public.profile_interactions i where i.actor_id=p_actor and i.target_id=p_candidate)
   and not exists(select 1 from public.profile_matches m where m.member_low=least(p_actor,p_candidate) and m.member_high=greatest(p_actor,p_candidate))
 );
$$;
alter function private.joyheart_can_discover_pair(uuid,uuid) owner to postgres;
revoke all on function private.joyheart_can_discover_pair(uuid,uuid) from public,anon,authenticated;

create or replace function private.joyheart_discover_candidates(p_limit integer default 20)
returns table(candidate_id uuid,display_name text,age smallint,country text,city text,bio text,interests text[],relationship_intention text,compatibility_score integer,compatibility_reasons text[])
language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_limit integer := least(greatest(coalesce(p_limit,20),1),30);
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not private.joyheart_is_match_eligible(v_actor) or not exists(select 1 from public.member_discovery_preferences where user_id=v_actor and discovery_enabled) then return; end if;
 return query
 with actor as (
  select p.user_id,p.age,p.country,p.relationship_intention,p.interests,
         dp.preferred_languages,dp.relationship_intentions,pa.answers
  from public.profiles p join public.member_discovery_preferences dp on dp.user_id=p.user_id
  left join public.member_personality_answers pa on pa.user_id=p.user_id
  where p.user_id=v_actor and dp.discovery_enabled
 ), candidates as (
  select c.user_id,c.display_name,c.age,c.country,c.city,c.bio,c.interests,c.relationship_intention,
    a.country actor_country,a.relationship_intention actor_intention,
    (select count(*)::int from unnest(coalesce(a.interests,'{}'::text[])) ai where exists(select 1 from unnest(coalesce(c.interests,'{}'::text[])) ci where lower(ci)=lower(ai))) shared_interests,
    (select count(*)::int from unnest(coalesce(a.preferred_languages,'{}'::text[])) al where exists(select 1 from unnest(coalesce(cp.preferred_languages,'{}'::text[])) cl where lower(cl)=lower(al))) shared_languages,
    (select count(*)::int from jsonb_each(coalesce(a.answers,'{}'::jsonb)) aa join jsonb_each(coalesce(ca.answers,'{}'::jsonb)) cc on aa.key=cc.key and aa.value=cc.value) shared_answers
  from actor a join public.profiles c on c.user_id<>a.user_id
  join public.member_discovery_preferences cp on cp.user_id=c.user_id
  left join public.member_personality_answers ca on ca.user_id=c.user_id
  where private.joyheart_can_discover_pair(a.user_id,c.user_id)
 ), scored as (
  select x.*,
   least(100,30+least(20,shared_interests*5)+least(15,shared_languages*5)+least(15,shared_answers*3)
      +case when lower(country)=lower(actor_country) then 10 else 5 end+5
      +case when nullif(btrim(bio),'') is not null then 3 else 0 end
      +case when cardinality(coalesce(interests,'{}'::text[]))>=3 then 2 else 0 end)::int score
  from candidates x
 )
 select s.user_id,s.display_name,s.age,s.country,s.city,s.bio,s.interests,s.relationship_intention,s.score,
  array_remove(array[
   case when s.actor_intention=s.relationship_intention then 'You both want a '||lower(s.relationship_intention)||'.' end,
   case when s.shared_interests>0 then 'You share '||s.shared_interests::text||' interests.' end,
   case when s.shared_languages>0 then 'You selected languages in common.' end,
   case when s.shared_answers>0 then 'You gave similar answers to connection questions.' end,
   case when lower(s.country)=lower(s.actor_country) then 'You selected the same country.' end
  ],null)::text[]
 from scored s order by s.score desc,s.user_id limit v_limit;
end;
$$;
alter function private.joyheart_discover_candidates(integer) owner to postgres;
revoke all on function private.joyheart_discover_candidates(integer) from public,anon,authenticated;

create or replace function public.joyheart_discover_candidates(p_limit integer default 20)
returns table(candidate_id uuid,display_name text,age smallint,country text,city text,bio text,interests text[],relationship_intention text,compatibility_score integer,compatibility_reasons text[])
language sql stable security invoker set search_path = '' as $$ select * from private.joyheart_discover_candidates(p_limit); $$;
revoke all on function public.joyheart_discover_candidates(integer) from public,anon;
grant execute on function public.joyheart_discover_candidates(integer) to authenticated;
comment on function public.joyheart_discover_candidates(integer) is 'Returns capped eligible public profile fields and explainable compatibility reasons to the authenticated member only. Private preferences and answers are never returned.';
