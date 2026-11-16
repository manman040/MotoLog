// Runs only against an in-memory PostgreSQL engine; never connects to Supabase.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated,anon;
  grant execute on function auth.uid() to authenticated,anon;
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated,anon;
  grant select,insert,update,delete on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
`);
try {
  for (const file of [
    "202611160001_motolog_schema.sql",
    "202611160002_private_storage.sql",
  ]) {
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
    console.log(`PASS local PostgreSQL migration: ${file}`);
  }
  const alice = "11111111-1111-4111-8111-111111111111",
    bob = "22222222-2222-4222-8222-222222222222";
  const vehicle = "33333333-3333-4333-8333-333333333333",
    service = "44444444-4444-4444-8444-444444444444";
  await db.query("insert into auth.users(id) values ($1),($2)", [alice, bob]);
  async function as(uid, fn) {
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      uid,
    ]);
    try {
      return await fn();
    } finally {
      await db.exec("reset role");
    }
  }
  const payload = {
    type: "motorcycle",
    brand: "Honda",
    model: "Test",
    variant: "",
    year: 2024,
    registrationNumber: "LOCAL01",
    nickname: "",
    fuelType: "Petrol",
    transmission: "Manual",
    currentOdometerKm: 1000,
    purchaseDate: "",
    photoPath: "",
    archived: false,
  };
  await as(alice, async () => {
    await db.query("insert into public.vehicles(id,data) values ($1,$2)", [
      vehicle,
      JSON.stringify(payload),
    ]);
    await db.query(
      "insert into public.maintenance_records(id,vehicle_id,data) values ($1,$2,$3)",
      [
        service,
        vehicle,
        JSON.stringify({
          categoryId: "Engine oil",
          serviceDate: "2026-01-01",
          odometerKm: 1000,
          description: "Local test",
          workshop: "",
          costSen: 2500,
          notes: "",
          receiptPath: "",
          nextDueKm: null,
          nextDueDate: "",
        }),
      ],
    );
    assert.equal(
      (
        await db.query("select amount_sen from public.expenses where id=$1", [
          service,
        ])
      ).rows[0].amount_sen,
      2500,
    );
    await assert.rejects(
      db.query(
        "update public.expenses set data=data||'{\"amountSen\":5000}' where id=$1",
        [service],
      ),
    );
    await db.query(
      "update public.maintenance_records set data=data||'{\"costSen\":3000}' where id=$1",
      [service],
    );
    assert.equal(
      (
        await db.query("select amount_sen from public.expenses where id=$1", [
          service,
        ])
      ).rows[0].amount_sen,
      3000,
    );
    const summary = (
      await db.query("select public.motolog_expense_summaries(2026) as summary")
    ).rows[0].summary;
    assert.equal(summary[0].totalSen, 3000);
    await assert.rejects(
      db.query("update public.vehicles set owner_id=$1 where id=$2", [
        bob,
        vehicle,
      ]),
    );
    await assert.rejects(
      db.query(
        "update public.vehicles set data=data||'{\"currentOdometerKm\":900}' where id=$1",
        [vehicle],
      ),
    );
    await db
      .query(
        "insert into public.odometer_logs(vehicle_id,data) values ($1,$2)",
        [
          vehicle,
          JSON.stringify({
            readingKm: 1100,
            recordedAt: "2099-01-01",
            note: "",
            correction: false,
          }),
        ],
      )
      .then(
        () => assert.fail("Future mileage accepted"),
        () => {},
      );
    const day = (
      await db.query(
        "select to_char(now() at time zone 'Asia/Kuala_Lumpur','YYYY-MM-DD') as date_value",
      )
    ).rows[0].date_value;
    await db.query(
      "insert into public.odometer_logs(vehicle_id,data) values ($1,$2)",
      [
        vehicle,
        JSON.stringify({
          readingKm: 1100,
          recordedAt: day,
          note: "",
          correction: false,
        }),
      ],
    );
    assert.equal(
      (
        await db.query(
          "select current_odometer_km from public.vehicles where id=$1",
          [vehicle],
        )
      ).rows[0].current_odometer_km,
      1100,
    );
    await assert.rejects(
      db.query(
        "insert into public.odometer_logs(vehicle_id,data) values ($1,$2)",
        [
          vehicle,
          JSON.stringify({
            readingKm: 900,
            recordedAt: day,
            note: "",
            correction: false,
          }),
        ],
      ),
    );
    await db.query(
      "insert into public.odometer_logs(vehicle_id,data) values ($1,$2)",
      [
        vehicle,
        JSON.stringify({
          readingKm: 900,
          recordedAt: day,
          note: "Instrument correction",
          correction: true,
        }),
      ],
    );
    assert.equal(
      (
        await db.query(
          "select current_odometer_km from public.vehicles where id=$1",
          [vehicle],
        )
      ).rows[0].current_odometer_km,
      900,
    );
    await assert.rejects(
      db.query("delete from public.odometer_logs where vehicle_id=$1", [
        vehicle,
      ]),
    );
    const doc = (
      await db.query(
        "insert into public.vehicle_documents(vehicle_id,data) values ($1,$2) returning id",
        [
          vehicle,
          JSON.stringify({
            documentType: "Insurance",
            title: "Local policy",
            provider: "Test insurer",
            policyReference: "",
            expiryDate: "2027-01-01",
            renewalCostSen: 10000,
            storagePath: "",
            fileName: "",
          }),
        ],
      )
    ).rows[0].id;
    await db.query(
      'update public.vehicle_documents set data=data||\'{"title":"Updated policy"}\' where id=$1',
      [doc],
    );
    assert.equal(
      (
        await db.query(
          "select data from public.vehicle_documents where id=$1",
          [doc],
        )
      ).rows[0].data.title,
      "Updated policy",
    );
    const fuel = (
      await db.query(
        "insert into public.fuel_logs(vehicle_id,data) values ($1,$2) returning id",
        [
          vehicle,
          JSON.stringify({
            date: "2026-01-01",
            odometerKm: 900,
            litres: 5,
            totalCostSen: 1000,
            fuelType: "Petrol",
            fullTank: true,
            notes: "",
          }),
        ],
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query("select source_type from public.expenses where id=$1", [
          fuel,
        ])
      ).rows[0].source_type,
      "fuel",
    );
    await db.query("delete from public.fuel_logs where id=$1", [fuel]);
    assert.equal(
      (await db.query("select id from public.expenses where id=$1", [fuel]))
        .rows.length,
      0,
    );
    const manual = (
      await db.query(
        "insert into public.expenses(vehicle_id,data) values ($1,$2) returning id",
        [
          vehicle,
          JSON.stringify({
            category: "Parking",
            amountSen: 100,
            expenseDate: "2026-01-01",
            description: "Local parking",
            odometerKm: null,
            receiptPath: "",
          }),
        ],
      )
    ).rows[0].id;
    await db.query(
      "update public.expenses set data=data||'{\"amountSen\":200}' where id=$1",
      [manual],
    );
    assert.equal(
      (
        await db.query("select amount_sen from public.expenses where id=$1", [
          manual,
        ])
      ).rows[0].amount_sen,
      200,
    );
    await db.query("delete from public.expenses where id=$1", [manual]);
    await db.query(
      "insert into storage.objects(bucket_id,name) values ($1,$2)",
      [
        "vehicle-photos",
        `${alice}/${vehicle}/55555555-5555-4555-8555-555555555555.jpg`,
      ],
    );
    await db.query("delete from public.maintenance_records where id=$1", [
      service,
    ]);
    assert.equal(
      (await db.query("select id from public.expenses where id=$1", [service]))
        .rows.length,
      0,
    );
  });
  await as(bob, async () => {
    assert.equal(
      (await db.query("select * from public.vehicles")).rows.length,
      0,
    );
    for (const table of [
      "maintenance_records",
      "odometer_logs",
      "expenses",
      "fuel_logs",
      "vehicle_documents",
      "maintenance_schedules",
    ])
      assert.equal(
        (await db.query(`select * from public.${table}`)).rows.length,
        0,
      );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("insert into public.expenses(vehicle_id,data) values ($1,$2)", [
        vehicle,
        JSON.stringify({
          category: "Parking",
          amountSen: 100,
          expenseDate: "2026-01-01",
          description: "Forbidden",
          odometerKm: null,
          receiptPath: "",
        }),
      ]),
    );
    await assert.rejects(
      db.query("insert into public.vehicles(owner_id,data) values ($1,$2)", [
        alice,
        JSON.stringify({ ...payload, registrationNumber: "FORGED" }),
      ]),
    );
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values ($1,$2)", [
        "vehicle-photos",
        `${alice}/${vehicle}/66666666-6666-4666-8666-666666666666.jpg`,
      ]),
    );
  });
  await db.exec("set role anon");
  await assert.rejects(db.query("select * from public.vehicles"));
  await db.exec("reset role");
  assert.equal(
    (
      await db.query(
        "select count(*)::integer as n from pg_class where relnamespace='public'::regnamespace and relname in ('vehicles','maintenance_records','odometer_logs','expenses','fuel_logs','maintenance_schedules','vehicle_documents') and relrowsecurity and relforcerowsecurity",
      )
    ).rows[0].n,
    7,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::integer as n from storage.buckets where public=false and file_size_limit=5242880",
      )
    ).rows[0].n,
    3,
  );
  for(const file of ['preflight.sql','post-deployment.sql']){
    await db.exec(await readFile(new URL(`../supabase/review/${file}`,import.meta.url),'utf8'));
    console.log(`PASS local read-only verification SQL: ${file}`);
  }
  console.log(
    "PASS local owner CRUD, linked expenses, mileage transaction, cross-user RLS, and Storage policy checks",
  );
} catch (error) {
  console.error(
    JSON.stringify({
      message: error.message,
      code: error.code,
      position: error.position,
      where: error.where,
    }),
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
