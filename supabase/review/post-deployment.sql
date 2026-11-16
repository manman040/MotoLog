-- READ ONLY. Expected: seven secured tables, 28 owner policies, seven owner
-- foreign keys to auth.users, six composite vehicle-owner parent foreign keys,
-- three private buckets, and three motolog Storage policies.
begin read only;
select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents') order by c.relname;
select tablename,policyname,cmd,roles,qual,with_check from pg_policies
where schemaname='public' and tablename in ('vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents') order by tablename,cmd;
select conrelid::regclass as table_name,conname,pg_get_constraintdef(oid) as definition
from pg_constraint where connamespace='public'::regnamespace and conrelid in
('public.vehicles'::regclass,'public.maintenance_records'::regclass,'public.odometer_logs'::regclass,'public.expenses'::regclass,'public.fuel_logs'::regclass,'public.maintenance_schedules'::regclass,'public.vehicle_documents'::regclass) order by table_name,conname;
select tablename,indexname,indexdef from pg_indexes where schemaname='public'
and tablename in ('vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents');
select event_object_table,trigger_name,action_timing,event_manipulation from information_schema.triggers
where trigger_schema='public' and event_object_table in ('vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents');
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id in ('vehicle-photos','service-receipts','vehicle-documents');
select policyname,cmd,roles,qual,with_check from pg_policies where schemaname='storage' and tablename='objects';
select has_table_privilege('anon','public.vehicles','SELECT') as anonymous_vehicle_read_should_be_false,
has_table_privilege('authenticated','public.vehicles','DELETE') as vehicle_delete_should_be_false,
has_table_privilege('authenticated','public.odometer_logs','UPDATE') as log_update_should_be_false,
has_table_privilege('authenticated','public.odometer_logs','DELETE') as log_delete_should_be_false;
select p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='motolog_expense_summaries';
rollback;
