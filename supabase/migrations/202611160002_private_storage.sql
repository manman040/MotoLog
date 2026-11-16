-- REVIEW ONLY. Apply after the schema migration, only with explicit approval.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('vehicle-photos','vehicle-photos',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('service-receipts','service-receipts',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']),
 ('vehicle-documents','vehicle-documents',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']);

-- Object names must be {uid}/{vehicle_uuid}/{random_file}.{extension}.
-- Exact parent ownership is checked, not merely the first folder.
create function motolog_private.owns_storage_vehicle(object_name text) returns boolean
language sql stable security invoker set search_path='' as $$
 select (storage.foldername(object_name))[1]=(select auth.uid())::text
   and array_length(storage.foldername(object_name),1)=2
   and exists(select 1 from public.vehicles v where v.owner_id=(select auth.uid()) and v.id::text=(storage.foldername(object_name))[2]);
$$;
revoke all on function motolog_private.owns_storage_vehicle(text) from public,anon;
grant execute on function motolog_private.owns_storage_vehicle(text) to authenticated;
create policy motolog_private_read on storage.objects for select to authenticated
 using(bucket_id in ('vehicle-photos','service-receipts','vehicle-documents') and motolog_private.owns_storage_vehicle(name));
create policy motolog_private_upload on storage.objects for insert to authenticated
 with check(bucket_id in ('vehicle-photos','service-receipts','vehicle-documents') and motolog_private.owns_storage_vehicle(name)
  and name ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+\.(jpeg|jpg|png|webp|pdf)$'
  and (bucket_id<>'vehicle-photos' or name !~ '\.pdf$'));
create policy motolog_private_delete on storage.objects for delete to authenticated
 using(bucket_id in ('vehicle-photos','service-receipts','vehicle-documents') and motolog_private.owns_storage_vehicle(name));
-- No UPDATE policy: files are immutable. Replacements use a new UUID.
commit;
