-- READ ONLY. Run in the target project's SQL editor BEFORE approving deployment.
begin read only;
select current_database() as database_name,current_user as database_role;
-- Existing tables must be reconciled before running the non-idempotent migrations.
select n.nspname as schema_name,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','motolog_private') and c.relname in
('vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents');
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets
where id in ('vehicle-photos','service-receipts','vehicle-documents');
-- Inspect ALL shared Storage policies. A broad existing policy can bypass a new
-- restrictive-looking owner policy because permissive policies combine with OR.
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where (schemaname='storage' and tablename='objects')
or schemaname='public' and tablename in ('vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents')
order by schemaname,tablename,policyname;
select n.nspname,p.proname,p.prosecdef as security_definer,p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='motolog_private' or n.nspname='public' and p.proname='motolog_expense_summaries';
rollback;
