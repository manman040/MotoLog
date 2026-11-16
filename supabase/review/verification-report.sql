-- Read-only hosted deployment verification. Returns booleans, not user records.
with app_tables as (
  select c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c
  join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  and c.relkind='r' and c.relname in ('vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents')
), app_policies as (
  select * from pg_policies where schemaname='public' and tablename in (select relname from app_tables)
)
select jsonb_build_object(
  'seven_tables_with_forced_rls',(select count(*)=7 and bool_and(relrowsecurity and relforcerowsecurity) from app_tables),
  'twenty_eight_owner_policies',(select count(*)=28 and bool_and(roles='{authenticated}'::name[] and ((cmd='INSERT' and with_check like '%auth.uid()%owner_id%') or (cmd='UPDATE' and qual like '%auth.uid()%owner_id%' and with_check like '%auth.uid()%owner_id%') or (cmd in ('SELECT','DELETE') and qual like '%auth.uid()%owner_id%'))) from app_policies),
  'anonymous_table_access_denied',(select bool_and(not has_table_privilege('anon',oid,'SELECT') and not has_table_privilege('anon',oid,'INSERT') and not has_table_privilege('anon',oid,'UPDATE') and not has_table_privilege('anon',oid,'DELETE')) from app_tables),
  'vehicle_delete_denied',not has_table_privilege('authenticated','public.vehicles','DELETE'),
  'odometer_history_immutable',not has_table_privilege('authenticated','public.odometer_logs','UPDATE') and not has_table_privilege('authenticated','public.odometer_logs','DELETE'),
  'six_composite_parent_foreign_keys',(select count(*)=6 from pg_constraint where contype='f' and confrelid='public.vehicles'::regclass and conrelid in (select oid from app_tables) and array_length(conkey,1)=2),
  'seven_auth_owner_foreign_keys',(select count(*)=7 from pg_constraint where contype='f' and confrelid='auth.users'::regclass and conrelid in (select oid from app_tables)),
  'owner_registration_uniqueness',exists(select 1 from pg_constraint where conrelid='public.vehicles'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (owner_id, registration_number)'),
  'eight_query_indexes',(select count(*)=8 from pg_indexes where schemaname='public' and indexname in ('vehicles_owner_created','maintenance_owner_vehicle','odometer_owner_vehicle','expenses_owner_vehicle','expenses_owner_date','fuel_owner_vehicle','schedules_owner_vehicle','documents_owner_vehicle')),
  'nine_integrity_triggers',(select count(*)=9 from pg_trigger where not tgisinternal and tgrelid in (select oid from app_tables)),
  'summary_rpc_invoker_only',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='motolog_expense_summaries' and not p.prosecdef and has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE')),
  'three_private_5mb_buckets',(select count(*)=3 and bool_and(not public and file_size_limit=5242880 and allowed_mime_types @> array['image/jpeg','image/png','image/webp'] and (id='vehicle-photos' and not 'application/pdf'=any(allowed_mime_types) or id<>'vehicle-photos' and 'application/pdf'=any(allowed_mime_types))) from storage.buckets where id in ('vehicle-photos','service-receipts','vehicle-documents')),
  'only_three_reviewed_storage_policies',(select count(*)=3 and bool_and(policyname in ('motolog_private_read','motolog_private_upload','motolog_private_delete') and roles='{authenticated}'::name[] and cmd in ('SELECT','INSERT','DELETE') and coalesce(qual,with_check) like '%owns_storage_vehicle(name)%') from pg_policies where schemaname='storage' and tablename='objects'),
  'storage_rls_enabled',(select relrowsecurity from pg_class where oid='storage.objects'::regclass)
) as verification;
