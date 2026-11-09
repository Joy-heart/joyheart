begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(39);

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

select extensions.ok(not has_function_privilege('anon', 'public.joyheart_send_message(uuid,text,uuid)', 'EXECUTE'), 'anonymous users cannot send messages');
select extensions.ok(not has_function_privilege('anon', 'public.joyheart_record_interaction(uuid,text)', 'EXECUTE'), 'anonymous users cannot create interactions');
select extensions.ok(not has_function_privilege('anon', 'public.joyheart_mark_conversation_read(uuid)', 'EXECUTE'), 'anonymous users cannot mark messages read');


select extensions.ok(not has_schema_privilege('anon', 'private', 'USAGE'), 'private schema is not accessible to anonymous API users');
select extensions.ok(has_schema_privilege('authenticated', 'private', 'USAGE'), 'authenticated users can call approved RPC wrappers');
select extensions.ok(not has_function_privilege('anon', 'private.joyheart_send_message(uuid,text,uuid)', 'EXECUTE'), 'anonymous users cannot execute private message implementation');
select extensions.ok(to_regprocedure('private.joyheart_is_match_eligible(uuid)') is not null, 'server-side matching eligibility function exists');
select extensions.ok((select prosecdef from pg_proc where oid = 'private.joyheart_is_match_eligible(uuid)'::regprocedure), 'eligibility checks run inside the private security definer');
select extensions.ok(not has_function_privilege('anon', 'private.joyheart_is_match_eligible(uuid)', 'EXECUTE'), 'anonymous users cannot execute matching eligibility checks');
select extensions.ok(has_function_privilege('authenticated', 'private.joyheart_is_match_eligible(uuid)', 'EXECUTE'), 'authenticated RPC implementations can call matching eligibility checks');

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

select * from extensions.finish();
rollback;
