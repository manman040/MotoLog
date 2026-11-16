# Architecture and data contracts

## Boundaries

`src/app` contains App Router routes. Dashboard routes share the authenticated shell and feature data provider. Auth SDK initialization is lazy and no Firebase app is initialized during server prerendering. Account reads and writes go through the typed `Repository` interface; browser-local samples implement the same interface independently. Domain calculations in `features/*` do not depend on React.

The public Next.js route shell contains no user records. Security is enforced at Firebase, not by route redirects. Only a user whose authenticated UID matches the path can access a user subtree. Deny-by-default rules do not grant recursive wildcard access to unknown collections. No privileged service key is used.

## Collections

| Path below `users/{uid}`                         | Purpose and relationships                                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| root profile                                     | Display name, token-matching email, regional preferences, update timestamp                                        |
| `vehicles/{vehicleId}`                           | Immutable `ownerUid`, vehicle metadata, archive flag, current mileage, latest log/date, timestamps                |
| `registrations/{normalizedRegistration}`         | Unique registration reservation pointing to a vehicle; rules require a matching vehicle after the atomic write    |
| `summaries/{YYYY-MM}`                            | Total sen plus category and vehicle maps; at most 12 reads per analytics year                                     |
| `vehicles/{vehicleId}/odometerLogs/{id}`         | Append-only reading, calendar date, previous reading, correction flag/reason and timestamps                       |
| `vehicles/{vehicleId}/serviceRecords/{id}`       | Service category (including custom names), description, cost, mileage, workshop, next due fields and receipt path |
| `vehicles/{vehicleId}/expenses/{id}`             | Canonical expense rows; source type `manual`, `service`, or `fuel`                                                |
| `vehicles/{vehicleId}/fuelLogs/{id}`             | Fuel quantity, cost sen, date, mileage and full-tank flag                                                         |
| `vehicles/{vehicleId}/maintenanceSchedules/{id}` | User-entered mileage/date thresholds, optional intervals, warnings, active/completed flags                        |
| `vehicles/{vehicleId}/documents/{id}`            | Insurance/road tax/etc., title, issuer, policy reference, expiry, renewal sen, storage path/file name             |

UUIDs are generated before transactions so retries reuse the same IDs. Linked expenses use `service_{serviceId}` / `fuel_{fuelId}`. Manual expenses cannot occupy those reserved namespaces. Normalized registrations use uppercase letters/numbers/hyphens, stripping spaces.

## Atomic writes

- Vehicle creation/edit and registration reservation/release occur in one transaction. Vehicle owner fields cannot change; deleting a vehicle is disallowed (archive instead).
- Odometer append reads the current vehicle, validates the new reading, then creates an immutable log and updates vehicle mileage/latest date/log ID in one transaction. Rules use `getAfter` to require the matching log and vehicle state. Normal decreases fail. Corrections require an explicit flag and reason. Backdated readings before the latest date are rejected; a correction effective today preserves history without recalculating historical service/fuel entries.
- A service or fuel create/edit/delete updates its canonical linked expense and all affected month summaries in the same transaction. Moving a date between months subtracts from the old month and adds to the new one. Categories and vehicle totals receive corresponding deltas. Every document read occurs before transaction writes. Summary documents are also read to provide contention retries.
- Manual expenses update their own row and summaries in the same transaction. Analytics read only expense summaries, never add service/fuel costs a second time.
- Rules validate paired service/fuel expense costs and dates, prohibit orphaning linked rows on deletion, enforce allowed types/fields/lengths and reject ownership changes. Monthly summary caches are owner-writable and schema-checked. They are not independently authoritative against a malicious owner editing their own caches. For financial audit requirements, move aggregate maintenance to trusted server functions and deny direct summary writes.
- Storage and Firestore cannot share a transaction. Files upload first; a failed record save attempts file cleanup and reports errors. Delete/replacement retains old files for recovery. A scheduled orphan cleanup/reconciliation job is a future deployment enhancement, not an implemented background feature.

## Queries and indexes

Vehicle listing: `createdAt desc`, limited to 100. Record pages: a date field descending plus document ID descending, fetch 21, return 20 and an opaque next cursor. Date fields are `serviceDate`, `expenseDate`, `date`, `updatedAt`, `expiryDate`, and `recordedAt` for service, expense, fuel, schedule, document, and odometer collections respectively. Firestore default single-field descending indexes include the matching document-name ordering, so no additional composite index is needed for these queries. Annual summary queries use a range and order on `month`; this also uses a default index. Do not disable these indexes.

`firebase/firestore.indexes.json` intentionally contains no unnecessary composites. New combined server-side filters will need deliberate indexes and query contract changes. Current search/filter/sort operates on loaded pages and is labelled accordingly; it does not pretend to search an entire remote history. Dashboard recent activity is derived from bounded latest expense pages per active vehicle; dashboard financial totals read monthly cache documents. Reminder/document overview is bounded to 20 records per active vehicle and discloses truncation. For larger fleets, add vehicle pagination and indexed cross-vehicle reminder summaries before expanding the 100-vehicle scope.

## Files and privacy

Objects live at `users/{uid}/vehicles/{vehicleId}/{uuid}.{extension}`. Storage enforces authenticated path ownership, existing parent vehicle, allowlisted image/PDF MIME type, immutable objects, and a 5 MB maximum. MIME metadata is not malware scanning or content inspection; do not treat uploaded PDFs as trusted executable content. File paths, not file contents, are stored in Firestore. Download URLs are obtained only after authenticated reads; Firebase token download URLs are bearer links and should not be shared for private documents.

The service worker intercepts only same-origin navigation and falls back to a static public offline page on network failure. It does not cache account HTML, Firestore responses or attachments. Firestore persistent local cache is not enabled. Demo storage is deliberately browser-local and unrelated to Firebase.

## Quality and future extensions

Strict TypeScript, field validation, transactional repository integration tests, emulator authorization tests and desktop/phone Playwright workflows protect the core contracts. Deploying credentials, enabling App Check enforcement, production OAuth/email delivery and physical-device installation require project-specific acceptance checks. Family membership authorization, trusted aggregates, background push, offline conflict resolution and automatic rescheduling need separate designs before being advertised.
