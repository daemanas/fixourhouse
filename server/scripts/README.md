# Location master data

`Location` documents live in the `locations` MongoDB collection and use one
self-referencing tree:

`country -> state -> district -> city`

The idempotent importer uses the existing `india-states-districts` and
`country-state-city` package data to populate India (country code `IN`), its
states, districts, and city/town entries. It runs only when invoked; the API
server does not seed location records during startup.

## Import locally

Set `MONGODB_URI` and `LOCATION_IMPORT_EXPECTED_DB` in `server/.env`. The
expected database name must exactly match the database name selected by the
MongoDB URI. From the `server` directory, inspect the target first:

```sh
npm run import:locations -- --check
```

The command reports the MongoDB host, selected database, and current location
counts without writing. If these do not match the intended database, fix the
connection configuration before continuing.

Run the import:

```sh
npm run import:locations
```

The importer refuses to use a fallback/local database, checks the selected
database against `LOCATION_IMPORT_EXPECTED_DB`, checks for exact duplicate
location keys before creating the unique `(type, parentId, name)` index, and
uses upserts. Re-running it does not duplicate records. If duplicate keys are
reported, resolve them before retrying rather than dropping records that may
be referenced by customer/provider profiles.

## Import on Render

1. In the Render API service environment, set `NODE_ENV=production` so the
   health endpoint and startup log report production mode. Render supplies
   `PORT`; the server reads it and binds to `0.0.0.0`. Do not replace it with a
   hardcoded port.
2. Confirm `MONGODB_URI` points to the intended production cluster and
   `fixourhouse` database. The deployed connection log currently reports
   `...mongodb.net/fixourhouse`.
3. Set `LOCATION_IMPORT_EXPECTED_DB=fixourhouse`. This is an explicit database
   safety check, not a secret. Keep the existing `MONGODB_URI`; do not copy a
   local development URI into Render.
4. Open the service's Shell. From the repository root, inspect the connection:

   ```sh
   npm --prefix server run import:locations -- --check
   ```

5. If the displayed host/database are correct, run the import:

   ```sh
   npm --prefix server run import:locations
   ```

The current production API logs confirm the database is `fixourhouse`, but the
live country endpoint is empty. The importer must be run once against that
production database; it is intentionally not part of server startup. After
seeding, rerunning the command is safe and upserts the same hierarchy.

The script prints aggregate counts and verifies India (`code: IN`), India
states, districts, and cities after completion. Keep location import as an
explicit one-off Render Shell operation; do not put it in the web service's
start command.

## Production API checks

The original query-string routes remain supported. The following path routes
are supported as well:

```text
GET /api/v1/locations/countries
GET /api/v1/locations/states/:countryId
GET /api/v1/locations/districts/:stateId
GET /api/v1/locations/cities/:districtId
GET /api/v1/services
```

Use each response's `_id` for the next request. Responses retain the existing
`ApiResponse` structure and `countries`, `states`, `districts`, or `cities`
data key. `/services` only includes active services belonging to providers
whose `verificationStatus` is `approved` or `verified`; an empty catalog means
there are no matching public services in the connected database.
