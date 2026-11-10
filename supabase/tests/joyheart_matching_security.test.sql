begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(66);

select extensions.has_table('public', 'profile_interactions', 'private member likes and passes table exists');
select extensions.has_table('public', 'profile_blocks', 'member blocks table exists');
select extensions.has_table('public', 'profile_matches', 'mutual matches table exists');
select extensions.has_table('public', 'conversations', 'private conversations table exists');
select extensions.has_table('public', 'messages', 'private messages table exists');
select extensions.has_table('public', 'member_reports', 'private reports table exists');

select extensions.ok((select relrowsecurity from pg_class where oid = 'public.profile_interactions'::regclass), 'interactions enforce row level security');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.profile_blocks'::regclass), 'blocks enforce row level security');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.profile_matches'::regclass), 'matches enforce row level security');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.conversations'::regclass), 'conversations enforce row level security');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.messages'::regclass), 'messages enforce row level security');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.member_reports'::regclass), 'reports enforce row level security');

select extensions.ok(not has_table_privilege('anon', 'public.messages', 'INSERT'), 'anonymous users cannot insert messages');
select extensions.ok(not has_table_privilege('authenticated', 'public.messages', 'INSERT'), 'members cannot bypass the message RPC');
select extensions.ok(not has_table_privilege('authenticated', 'public.member_reports', 'INSERT'), 'members cannot bypass the report RPC');
select extensions.ok(not has_table_privilege('authenticated', 'public.profile_interactions', 'INSERT'), 'members cannot write interactions directly');
select extensions.ok(not has_table_privilege('authenticated', 'public.profile_blocks', 'INSERT'), 'members cannot write blocks directly');
select extensions.ok(has_table_privilege('authenticated', 'public.profile_blocks', 'SELECT'), 'block RLS checks have table access while row policy limits visibility');
select extensions.ok(not has_table_privilege('authenticated', 'public.profile_matches', 'UPDATE'), 'members cannot alter match status directly');
select extensions.ok(not has_table_privilege('authenticated', 'public.conversations', 'INSERT'), 'members cannot create conversations directly');
select extensions.ok(not has_table_privilege('authenticated', 'public.messages', 'UPDATE'), 'members cannot edit or delete messages directly');
select extensions.ok(not has_table_privilege('authenticated', 'public.messages', 'DELETE'), 'members cannot hard-delete messages directly');

select extensions.ok(not has_function_privilege('anon', 'public.joyheart_send_message(uuid,text,uuid)', 'EXECUTE'), 'anonymous users cannot send messages');
select extensions.ok(not has_function_privilege('anon', 'public.joyheart_record_interaction(uuid,text)', 'EXECUTE'), 'anonymous users cannot create interactions');
select extensions.ok(not has_function_privilege('anon', 'public.joyheart_mark_conversation_read(uuid)', 'EXECUTE'), 'anonymous users cannot mark messages read');


select extensions.ok(not has_schema_privilege('anon', 'private', 'USAGE'), 'private schema is not accessible to anonymous API users');
select extensions.ok(has_schema_privilege('authenticated', 'private', 'USAGE'), 'authenticated users can call approved RPC wrappers');
select extensions.ok(not has_function_privilege('anon', 'private.joyheart_send_message(uuid,text,uuid)', 'EXECUTE'), 'anonymous users cannot execute private message implementation');
select extensions.ok(to_regprocedure('private.joyheart_is_match_eligible(uuid)') is not null, 'server-side matching eligibility function exists');
select extensions.ok((select prosecdef from pg_proc where oid = 'private.joyheart_is_match_eligible(uuid)'::regprocedure), 'eligibility checks run inside the private security definer');
select extensions.ok(not has_function_privilege('anon', 'private.joyheart_is_match_eligible(uuid)', 'EXECUTE'), 'anonymous users cannot execute matching eligibility checks');

select extensions.ok(not (select prosecdef from pg_proc where oid = 'public.joyheart_send_message(uuid,text,uuid)'::regprocedure), 'public message RPC wrapper runs as invoker');
select extensions.ok((select prosecdef from pg_proc where oid = 'private.joyheart_send_message(uuid,text,uuid)'::regprocedure), 'private message implementation is security definer');
select extensions.ok(not has_function_privilege('anon', 'public.joyheart_send_message(uuid,text,uuid)', 'EXECUTE'), 'anonymous users cannot execute public message wrapper');

select extensions.ok(to_regprocedure('private.joyheart_unmatch_member(uuid)') is not null, 'private unmatch implementation exists');
select extensions.ok((select prosecdef from pg_proc where oid = 'private.joyheart_unmatch_member(uuid)'::regprocedure), 'unmatch implementation is security definer');
select extensions.ok(not has_function_privilege('anon', 'public.joyheart_unmatch_member(uuid)', 'EXECUTE'), 'anonymous users cannot unmatch members');

select extensions.ok(to_regprocedure('private.joyheart_send_message(uuid,text,uuid)') is not null, 'private send-message implementation exists');
select extensions.ok(to_regprocedure('private.joyheart_mark_conversation_read(uuid)') is not null, 'private read-receipt implementation exists');
select extensions.ok(to_regprocedure('private.joyheart_block_member(uuid)') is not null, 'private block implementation exists');
select extensions.ok(to_regprocedure('private.joyheart_report_member(uuid,text,uuid,uuid)') is not null, 'private report implementation exists');

select extensions.ok(to_regprocedure('private.joyheart_edit_message(uuid,text)') is not null, 'private edit-message implementation exists');
select extensions.ok(to_regprocedure('private.joyheart_delete_message(uuid)') is not null, 'private soft-delete implementation exists');
select extensions.ok(to_regprocedure('public.joyheart_edit_message(uuid,text)') is not null, 'public edit-message wrapper exists');
select extensions.ok(to_regprocedure('public.joyheart_delete_message(uuid)') is not null, 'public delete-message wrapper exists');

select extensions.ok(to_regclass('private.joyheart_message_evidence') is not null, 'deleted message evidence is stored outside the exposed public schema');
select extensions.ok(not has_table_privilege('authenticated', 'private.joyheart_message_evidence', 'SELECT'), 'members cannot read original deleted message evidence');
select extensions.ok(not has_function_privilege('authenticated', 'private.joyheart_is_match_eligible(uuid)', 'EXECUTE'), 'members cannot directly probe another account eligibility');
select extensions.ok(private.joyheart_preference_accepts('Everyone', 'Man'), 'Everyone accepts Man');
select extensions.ok(private.joyheart_preference_accepts('Everyone', 'Woman'), 'Everyone accepts Woman');
select extensions.ok(private.joyheart_preference_accepts('Everyone', 'Non-binary'), 'Everyone accepts Non-binary');
select extensions.ok(private.joyheart_preference_accepts('Everyone', 'Prefer not to say'), 'Everyone accepts Prefer not to say');
select extensions.ok(private.joyheart_preference_accepts('Men', 'Man'), 'Men preference accepts Man');
select extensions.ok(not private.joyheart_preference_accepts('Men', 'Non-binary'), 'Men preference does not silently include other identities');
select extensions.ok(private.joyheart_preference_accepts('Women', 'Woman'), 'Women preference accepts Woman');
select extensions.ok(not private.joyheart_preference_accepts('Women', 'Prefer not to say'), 'Women preference does not silently include other identities');

select extensions.ok(to_regprocedure('private.joyheart_can_discover_pair(uuid,uuid)') is not null, 'private mutual discovery eligibility function exists');
select extensions.ok(not has_function_privilege('authenticated', 'private.joyheart_can_discover_pair(uuid,uuid)', 'EXECUTE'), 'members cannot probe pair eligibility directly');
select extensions.ok(to_regprocedure('private.joyheart_discover_candidates(integer)') is not null, 'private candidate ranking implementation exists');
select extensions.ok(has_function_privilege('authenticated', 'private.joyheart_discover_candidates(integer)', 'EXECUTE'), 'authenticated members can invoke the protected candidate implementation');
select extensions.ok(has_function_privilege('authenticated', 'public.joyheart_discover_candidates(integer)', 'EXECUTE') and not has_function_privilege('anon', 'public.joyheart_discover_candidates(integer)', 'EXECUTE'), 'candidate discovery RPC is authenticated-only');


select extensions.ok(to_regclass('private.joyheart_feature_flags') is not null, 'private discovery launch flag table exists');
select extensions.ok(not private.joyheart_discovery_is_open(), 'global discovery launch gate defaults to closed');
select extensions.ok(not has_function_privilege('authenticated', 'private.joyheart_discovery_is_open()', 'EXECUTE'), 'members cannot inspect or change the global discovery gate');
select extensions.ok((select prosecdef from pg_proc where oid = 'private.joyheart_record_interaction(uuid,text)'::regprocedure), 'like and pass implementation remains protected by security definer');
select extensions.ok(not has_function_privilege('anon', 'public.joyheart_discover_candidates(integer)', 'EXECUTE'), 'anonymous users cannot call candidate ranking');

select * from extensions.finish();
rollback;
