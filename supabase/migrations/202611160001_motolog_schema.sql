-- REVIEW ONLY. Do not apply until explicitly approved.
-- Existing Firebase data is not copied or modified by this migration.
begin;
grant usage on schema public to authenticated;

create schema if not exists motolog_private;
revoke all on schema motolog_private from public;
grant usage on schema motolog_private to authenticated;

-- Keep the established camelCase domain payload while using relational ownership,
-- parent keys, unique registrations and typed/generated query columns.
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  registration_number text generated always as (data->>'registrationNumber') stored not null,
  current_odometer_km integer generated always as ((data->>'currentOdometerKm')::integer) stored not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, owner_id),
  unique(owner_id, registration_number),
  check (registration_number ~ '^[A-Z0-9-]{1,20}$'),
  check (current_odometer_km between 0 and 10000000),
  check (data->>'type' in ('motorcycle','car')),
  check ((data->>'year')::integer between 1900 and 2100)
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null,
  data jsonb not null check(jsonb_typeof(data)='object'),
  service_date text generated always as (data->>'serviceDate') stored not null,
  cost_sen bigint generated always as ((data->>'costSen')::bigint) stored not null check(cost_sen between 0 and 100000000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(vehicle_id,owner_id) references public.vehicles(id,owner_id) on delete cascade
);
create table public.odometer_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null,
  data jsonb not null check(jsonb_typeof(data)='object'),
  reading_km integer generated always as ((data->>'readingKm')::integer) stored not null check(reading_km between 0 and 10000000),
  recorded_at text generated always as (data->>'recordedAt') stored not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(vehicle_id,owner_id) references public.vehicles(id,owner_id) on delete cascade
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null,
  data jsonb not null check(jsonb_typeof(data)='object'),
  source_type text not null default 'manual' check(source_type in ('manual','service','fuel')),
  source_record_id uuid,
  amount_sen bigint generated always as ((data->>'amountSen')::bigint) stored not null check(amount_sen between 0 and 100000000),
  expense_date text generated always as (data->>'expenseDate') stored not null,
  category text generated always as (data->>'category') stored not null check(category in ('Maintenance','Repairs','Fuel','Insurance','Road tax','Parking','Tolls','Accessories','Other')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(vehicle_id,owner_id) references public.vehicles(id,owner_id) on delete cascade,
  check ((source_type='manual' and source_record_id is null) or (source_type in ('service','fuel') and source_record_id=id)),
  unique(source_type,source_record_id)
);
create table public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null,
  data jsonb not null check(jsonb_typeof(data)='object'),
  fuel_date text generated always as (data->>'date') stored not null,
  total_cost_sen bigint generated always as ((data->>'totalCostSen')::bigint) stored not null check(total_cost_sen between 0 and 100000000),
  litres numeric generated always as ((data->>'litres')::numeric) stored not null check(litres>0 and litres<=1000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(vehicle_id,owner_id) references public.vehicles(id,owner_id) on delete cascade
);
-- Retain existing reminder and document features when switching backends.
create table public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null,
  data jsonb not null check(jsonb_typeof(data)='object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(vehicle_id,owner_id) references public.vehicles(id,owner_id) on delete cascade
);
create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null,
  data jsonb not null check(jsonb_typeof(data)='object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(vehicle_id,owner_id) references public.vehicles(id,owner_id) on delete cascade
);

create index vehicles_owner_created on public.vehicles(owner_id,created_at desc);
create index maintenance_owner_vehicle on public.maintenance_records(owner_id,vehicle_id,created_at desc,id desc);
create index odometer_owner_vehicle on public.odometer_logs(owner_id,vehicle_id,created_at desc,id desc);
create index expenses_owner_vehicle on public.expenses(owner_id,vehicle_id,created_at desc,id desc);
create index expenses_owner_date on public.expenses(owner_id,expense_date);
create index fuel_owner_vehicle on public.fuel_logs(owner_id,vehicle_id,created_at desc,id desc);
create index schedules_owner_vehicle on public.maintenance_schedules(owner_id,vehicle_id,created_at desc,id desc);
create index documents_owner_vehicle on public.vehicle_documents(owner_id,vehicle_id,created_at desc,id desc);

do $$ declare t text; begin
  foreach t in array array['vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid())=owner_id)',t);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=owner_id)',t);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id)',t);
    execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=owner_id)',t);
  end loop;
end $$;
revoke delete on public.vehicles from authenticated;
revoke update,delete on public.odometer_logs from authenticated;

create function motolog_private.require_text(d jsonb,k text,max_length integer,required boolean default false)
returns void language plpgsql immutable set search_path='' as $$ begin
  if jsonb_typeof(d->k) is distinct from 'string' or length(d->>k)>max_length or (required and length(trim(d->>k))=0) then
    raise exception 'Invalid field: %',k using errcode='23514';
  end if;
end $$;
create function motolog_private.require_number(d jsonb,k text,maximum numeric,nullable boolean default false,whole boolean default true)
returns void language plpgsql immutable set search_path='' as $$ declare n numeric; begin
  if nullable and d ? k and d->k='null'::jsonb then return; end if;
  if jsonb_typeof(d->k) is distinct from 'number' then raise exception 'Invalid numeric field: %',k using errcode='23514';end if;
  n=(d->>k)::numeric;
  if n<0 or n>maximum or (whole and n<>trunc(n)) then raise exception 'Numeric field out of range: %',k using errcode='23514';end if;
end $$;
create function motolog_private.require_date(d jsonb,k text,optional boolean default false,past_only boolean default false)
returns void language plpgsql stable set search_path='' as $$ declare v text; parsed date; begin
  perform motolog_private.require_text(d,k,10); v=d->>k;
  if optional and v='' then return;end if;
  if v !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date: %',k using errcode='23514';end if;
  parsed=v::date;
  if to_char(parsed,'YYYY-MM-DD')<>v or (past_only and parsed>(now() at time zone 'Asia/Kuala_Lumpur')::date) then raise exception 'Invalid date: %',k using errcode='23514';end if;
end $$;

create function motolog_private.validate_payload(kind text,d jsonb) returns void
language plpgsql set search_path='' as $$ declare allowed text[]; k text; begin
  if jsonb_typeof(d)<>'object' or octet_length(d::text)>20000 then raise exception 'Invalid record payload' using errcode='23514';end if;
  case kind
  when 'vehicles' then
    allowed=array['type','brand','model','variant','year','registrationNumber','nickname','fuelType','transmission','currentOdometerKm','purchaseDate','photoPath','archived','latestReadingDate','latestLogId'];
    perform motolog_private.require_text(d,'type',10,true);perform motolog_private.require_text(d,'brand',60,true);perform motolog_private.require_text(d,'model',80,true);
    perform motolog_private.require_text(d,'variant',80);perform motolog_private.require_text(d,'nickname',80);
    perform motolog_private.require_text(d,'fuelType',40,true);perform motolog_private.require_text(d,'transmission',40,true);
    perform motolog_private.require_number(d,'currentOdometerKm',10000000);perform motolog_private.require_number(d,'year',extract(year from now())+1);
    perform motolog_private.require_date(d,'purchaseDate',true,true);perform motolog_private.require_text(d,'photoPath',500);
    if jsonb_typeof(d->'archived') is distinct from 'boolean' then raise exception 'Invalid archived flag' using errcode='23514';end if;
  when 'maintenance_records' then
    allowed=array['categoryId','serviceDate','odometerKm','description','workshop','costSen','notes','receiptPath','nextDueKm','nextDueDate'];
    perform motolog_private.require_text(d,'categoryId',80,true);perform motolog_private.require_date(d,'serviceDate',false,true);
    perform motolog_private.require_number(d,'odometerKm',10000000);perform motolog_private.require_number(d,'costSen',100000000);
    perform motolog_private.require_text(d,'description',300,true);perform motolog_private.require_text(d,'workshop',120);perform motolog_private.require_text(d,'notes',2000);perform motolog_private.require_text(d,'receiptPath',500);
    perform motolog_private.require_number(d,'nextDueKm',10000000,true);perform motolog_private.require_date(d,'nextDueDate',true);
  when 'expenses' then
    allowed=array['category','amountSen','expenseDate','description','odometerKm','receiptPath'];
    perform motolog_private.require_number(d,'amountSen',100000000);perform motolog_private.require_date(d,'expenseDate',false,true);
    perform motolog_private.require_text(d,'description',300,true);perform motolog_private.require_number(d,'odometerKm',10000000,true);perform motolog_private.require_text(d,'receiptPath',500);
  when 'fuel_logs' then
    allowed=array['date','odometerKm','litres','totalCostSen','fuelType','fullTank','notes'];
    perform motolog_private.require_date(d,'date',false,true);perform motolog_private.require_number(d,'odometerKm',10000000);perform motolog_private.require_number(d,'litres',1000,false,false);perform motolog_private.require_number(d,'totalCostSen',100000000);
    perform motolog_private.require_text(d,'fuelType',40,true);perform motolog_private.require_text(d,'notes',2000);
    if jsonb_typeof(d->'fullTank') is distinct from 'boolean' then raise exception 'Invalid full tank flag' using errcode='23514';end if;
  when 'odometer_logs' then
    allowed=array['readingKm','recordedAt','note','correction','previousReadingKm'];
    perform motolog_private.require_number(d,'readingKm',10000000);perform motolog_private.require_date(d,'recordedAt',false,true);perform motolog_private.require_text(d,'note',1000);
    if jsonb_typeof(d->'correction') is distinct from 'boolean' then raise exception 'Invalid correction flag' using errcode='23514';end if;
  when 'maintenance_schedules' then
    allowed=array['categoryId','intervalKm','intervalMonths','nextDueKm','nextDueDate','warningKm','warningDays','active','completed'];
    perform motolog_private.require_text(d,'categoryId',80,true);perform motolog_private.require_number(d,'intervalKm',1000000,true);perform motolog_private.require_number(d,'intervalMonths',240,true);perform motolog_private.require_number(d,'nextDueKm',10000000,true);perform motolog_private.require_date(d,'nextDueDate',true);perform motolog_private.require_number(d,'warningKm',100000);perform motolog_private.require_number(d,'warningDays',365);
    if (d->'nextDueKm'='null'::jsonb and d->>'nextDueDate'='') or jsonb_typeof(d->'active') is distinct from 'boolean' or jsonb_typeof(d->'completed') is distinct from 'boolean' or (d->>'intervalKm')::numeric=0 or (d->>'intervalMonths')::numeric=0 then raise exception 'Invalid reminder thresholds' using errcode='23514';end if;
  when 'vehicle_documents' then
    allowed=array['documentType','title','provider','policyReference','expiryDate','renewalCostSen','storagePath','fileName'];
    perform motolog_private.require_text(d,'title',120,true);perform motolog_private.require_text(d,'provider',120);perform motolog_private.require_text(d,'policyReference',100);perform motolog_private.require_date(d,'expiryDate',true);perform motolog_private.require_number(d,'renewalCostSen',100000000);perform motolog_private.require_text(d,'storagePath',500);perform motolog_private.require_text(d,'fileName',200);
    if coalesce(d->>'documentType','') not in ('Insurance','Road tax','Registration','Warranty','Other') then raise exception 'Invalid document type' using errcode='23514';end if;
  else raise exception 'Unknown record type';
  end case;
  for k in select jsonb_object_keys(d) loop
    if not k=any(allowed) then raise exception 'Unexpected field: %',k using errcode='23514';end if;
  end loop;
end $$;

create function motolog_private.guard_vehicle() returns trigger language plpgsql set search_path='' as $$ begin
  if TG_OP='UPDATE' then
    if new.owner_id<>old.owner_id or new.id<>old.id then raise exception 'Vehicle ownership is immutable' using errcode='42501';end if;
    if pg_trigger_depth()=1 and (new.data->>'currentOdometerKm')::integer<>old.current_odometer_km then raise exception 'Add an odometer reading to change mileage' using errcode='23514';end if;
    new.created_at=old.created_at;
    if pg_trigger_depth()=1 then new.data=new.data||jsonb_build_object('latestReadingDate',old.data->'latestReadingDate','latestLogId',old.data->'latestLogId');end if;
  else
    new.created_at=now();new.data=new.data||jsonb_build_object('latestReadingDate',to_char(now() at time zone 'Asia/Kuala_Lumpur','YYYY-MM-DD'),'latestLogId','');
  end if;
  if coalesce(new.data->>'photoPath','')<>'' and (new.data->>'photoPath' not like 'vehicle-photos/'||new.owner_id::text||'/'||new.id::text||'/%') then raise exception 'Invalid private vehicle photo path' using errcode='23514';end if;
  new.updated_at=now();perform motolog_private.validate_payload('vehicles',new.data);return new;
end $$;
create trigger guard_vehicle before insert or update on public.vehicles for each row execute function motolog_private.guard_vehicle();

create function motolog_private.guard_record() returns trigger language plpgsql set search_path='' as $$ declare v public.vehicles; d jsonb; k text; p text; begin
  if TG_OP='DELETE' then
    if TG_TABLE_NAME='expenses' then
      if old.source_type<>'manual' and pg_trigger_depth()=1 then raise exception 'Delete the original service or fuel log' using errcode='23514';end if;
    end if;
    return old;
  end if;
  if TG_OP='UPDATE' then
    if new.owner_id<>old.owner_id or new.vehicle_id<>old.vehicle_id or new.id<>old.id then raise exception 'Record ownership and vehicle are immutable' using errcode='42501';end if;
    new.created_at=old.created_at;
  else new.created_at=now();end if;
  if TG_TABLE_NAME='expenses' then
    if pg_trigger_depth()=1 and (new.source_type<>'manual' or (TG_OP='UPDATE' and old.source_type<>'manual')) then raise exception 'Edit the original service or fuel log' using errcode='23514';end if;
  end if;
  select * into v from public.vehicles where id=new.vehicle_id and owner_id=new.owner_id for update;
  if not found or coalesce((v.data->>'archived')::boolean,true) then raise exception 'Choose an active vehicle' using errcode='23514';end if;
  d=new.data;perform motolog_private.validate_payload(TG_TABLE_NAME,d);
  if TG_TABLE_NAME in ('maintenance_records','fuel_logs') and (d->>'odometerKm')::integer>v.current_odometer_km then raise exception 'Update the odometer first' using errcode='23514';end if;
  if TG_TABLE_NAME='odometer_logs' then
    if TG_OP<>'INSERT' then raise exception 'Mileage history is immutable' using errcode='23514';end if;
    if d->>'recordedAt'<v.data->>'latestReadingDate' then raise exception 'Backdated mileage changes are not supported' using errcode='23514';end if;
    if not (d->>'correction')::boolean and (d->>'readingKm')::integer<v.current_odometer_km then raise exception 'Mileage cannot decrease without an explicit correction' using errcode='23514';end if;
    if (d->>'correction')::boolean and length(trim(d->>'note'))<10 then raise exception 'Explain the correction in at least 10 characters' using errcode='23514';end if;
    new.data=d||jsonb_build_object('previousReadingKm',v.current_odometer_km);
    update public.vehicles set data=data||jsonb_build_object('currentOdometerKm',(d->>'readingKm')::integer,'latestReadingDate',d->>'recordedAt','latestLogId',new.id::text) where id=new.vehicle_id and owner_id=new.owner_id;
  end if;
  foreach k in array array['receiptPath','storagePath'] loop
    p=coalesce(d->>k,'');
    if p<>'' and (p not like '%/'||new.owner_id::text||'/'||new.vehicle_id::text||'/%' or p !~ '^(service-receipts|vehicle-documents)/') then raise exception 'Invalid private attachment path' using errcode='23514';end if;
  end loop;
  new.updated_at=now();return new;
end $$;
do $$ declare t text;begin
  foreach t in array array['maintenance_records','expenses','fuel_logs','maintenance_schedules','vehicle_documents','odometer_logs'] loop
    execute format('create trigger guard_record before insert or update or delete on public.%I for each row execute function motolog_private.guard_record()',t);
  end loop;
end $$;

-- Linked expenses are generated inside the originating transaction. They cannot
-- be independently edited by a browser, and analytics count only expense rows.
create function motolog_private.sync_expense() returns trigger language plpgsql set search_path='' as $$ declare d jsonb; source text;begin
  source=case when TG_TABLE_NAME='maintenance_records' then 'service' else 'fuel' end;
  if TG_OP='DELETE' then delete from public.expenses where id=old.id and owner_id=old.owner_id and source_type=source;return old;end if;
  if source='service' then
    d=jsonb_build_object('category','Maintenance','amountSen',new.data->'costSen','expenseDate',new.data->>'serviceDate','description',new.data->>'description','odometerKm',new.data->'odometerKm','receiptPath',new.data->>'receiptPath');
  else
    d=jsonb_build_object('category','Fuel','amountSen',new.data->'totalCostSen','expenseDate',new.data->>'date','description','Fuel · '||(new.data->>'litres')||' L','odometerKm',new.data->'odometerKm','receiptPath','');
  end if;
  insert into public.expenses(id,owner_id,vehicle_id,data,source_type,source_record_id) values(new.id,new.owner_id,new.vehicle_id,d,source,new.id)
  on conflict(id) do update set data=excluded.data,source_type=excluded.source_type,source_record_id=excluded.source_record_id
    where public.expenses.owner_id=excluded.owner_id and public.expenses.vehicle_id=excluded.vehicle_id and public.expenses.source_type=excluded.source_type;
  if not found then raise exception 'Linked expense ID conflict' using errcode='23505';end if;
  return new;
end $$;
create trigger service_expense after insert or update or delete on public.maintenance_records for each row execute function motolog_private.sync_expense();
create trigger fuel_expense after insert or update or delete on public.fuel_logs for each row execute function motolog_private.sync_expense();

create function public.motolog_expense_summaries(p_year integer) returns jsonb
language sql stable security invoker set search_path='' as $$
  with scoped as (select left(expense_date,7) as month_key,amount_sen,category,vehicle_id from public.expenses where owner_id=(select auth.uid()) and expense_date>=p_year::text||'-01-01' and expense_date<(p_year+1)::text||'-01-01'),
  totals as (select month_key,sum(amount_sen) total from scoped group by month_key),
  cats as (select month_key,jsonb_object_agg(category,total) breakdown from (select month_key,category,sum(amount_sen) total from scoped group by month_key,category) c group by month_key),
  cars as (select month_key,jsonb_object_agg(vehicle_id,total) breakdown from (select month_key,vehicle_id,sum(amount_sen) total from scoped group by month_key,vehicle_id) v group by month_key)
  select coalesce(jsonb_agg(jsonb_build_object('id',t.month_key,'month',t.month_key,'totalSen',t.total,'categories',c.breakdown,'vehicles',v.breakdown) order by t.month_key),'[]'::jsonb) from totals t join cats c using(month_key) join cars v using(month_key);
$$;
revoke all on function public.motolog_expense_summaries(integer) from public,anon;
grant execute on function public.motolog_expense_summaries(integer) to authenticated;
revoke all on all functions in schema motolog_private from public,anon;
grant execute on all functions in schema motolog_private to authenticated;

commit;
