-- One read-only result for CLI/Management API deployment preflight.
select jsonb_build_object(
  'database',current_database(),
  'tables',coalesce((select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','motolog_private') and c.relname in ('vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents')),'[]'::jsonb),
  'buckets',coalesce((select jsonb_agg(jsonb_build_object('id',id,'public',public,'limit',file_size_limit,'types',allowed_mime_types)) from storage.buckets where id in ('vehicle-photos','service-receipts','vehicle-documents')),'[]'::jsonb),
  'policies',coalesce((select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',policyname,'roles',roles,'command',cmd,'using',qual,'check',with_check)) from pg_policies where (schemaname='storage' and tablename='objects') or (schemaname='public' and tablename in ('vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents'))),'[]'::jsonb),
  'functions',coalesce((select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'securityDefiner',p.prosecdef)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='motolog_private' or (n.nspname='public' and p.proname='motolog_expense_summaries')),'[]'::jsonb)
) as preflight;
