# PWB Properties Plugin — Write-Capable Architecture

This document defines the next iteration of the `pwb-properties` plugin: a write-capable
admin integration that allows editors to create and update property listings in PWB from
inside EmDash.

For embedding PWB properties inside EmDash posts/pages via Portable Text blocks, see
[`docs/pwb-properties-content-embedding.md`](./pwb-properties-content-embedding.md).

This is not a loose concept note. It is intended to be concrete enough to implement.

---

## Executive Summary

The existing `pwb-properties` plugin is a read-only adapter:

- EmDash hosts the admin UI
- PWB remains the source of truth for listings
- the plugin reads property data over the PWB API

The write-capable version should keep that same core model:

- **do not move listings into EmDash collections**
- **do not duplicate search logic inside EmDash**
- **do not sync two different canonical stores**

Instead, the plugin becomes a structured admin-facing proxy for PWB write operations.

The recommended implementation is:

- keep `pwb-properties` as the plugin ID and package
- convert it from a narrow read-only Block Kit browser into a richer admin editing tool
- use **native/trusted plugin UI with React admin pages** for editing
- keep the backend route layer in the plugin so all write logic, validation, auth, and
  logging stay centralized

The frontend site still reads listings directly from PWB. The plugin only improves the
editor experience.

---

## Why This Direction

There are two broad options for editable listings:

1. make EmDash the listing backend
2. keep PWB as canonical and edit PWB through the plugin

This project already assumes:

- PWB owns listing schema and listing persistence
- PWB owns listing search and filtering behavior
- PWB owns listing detail content and enquiry flows
- EmDash owns pages, posts, menus, and site-managed content

Because of that, option 2 is the only pragmatic next step.

If EmDash became the listing backend, the project would need:

- new collections for properties and related entities
- new search/filter APIs
- new public rendering contracts
- migration and sync strategy from PWB
- media handling for listing galleries
- a plan to retire or heavily minimize PWB

That is a platform rewrite, not a plugin increment.

---

## Product Goal

Allow an authenticated EmDash admin user to:

- browse properties
- open a property edit view
- change a defined subset of fields
- save those changes to PWB
- see clear validation and save feedback

Later phases may add:

- create property
- publish/unpublish
- draft status
- media upload
- localized fields
- bulk actions

But the first implementation should not attempt all of those at once.

---

## Recommended Plugin Format

For the write-capable version, the recommended format is **native/trusted plugin** with
React admin pages.

Why:

- property editing needs larger forms than Block Kit handles comfortably
- editors will need field-level validation and likely grouped sections
- image handling, conditional fields, and async save states are much easier in React
- there may be future needs for autosave, dirty-form warnings, and optimistic refresh

That means:

- the plugin stays registered from `astro.config.mjs`
- it runs trusted in dev and production
- it should not rely on marketplace-style sandbox installation

If you explicitly want marketplace compatibility later, treat that as a separate product
goal. For now, prioritize the UX and implementation quality needed for listing editing.

---

## High-Level Architecture

```text
EmDash Admin React Page
  │
  │ usePluginAPI()
  ▼
Plugin Route Layer
  │
  ├── Validate EmDash user permissions
  ├── Read plugin settings (URL, auth mode, etc.)
  ├── Transform admin form input -> PWB payload
  ├── Call PWB write API
  ├── Normalize PWB validation errors
  └── Log request / response / failures
  ▼
PWB Rails API
  │
  ├── create property
  ├── update property
  ├── publish / unpublish
  ├── upload media (later)
  └── return canonical property JSON
```

Critical rule:

- the plugin never writes listing data into EmDash content tables

The plugin may store only:

- connection settings
- auth settings
- draft UI state if necessary
- audit/diagnostic metadata if useful

---

## Boundaries and Responsibilities

### EmDash admin UI is responsible for

- rendering forms
- collecting editor input
- displaying field errors and save status
- fetching latest property data for editing
- warning on unsaved changes

### Plugin route layer is responsible for

- authorizing access
- validating settings exist
- validating request shape
- transforming between UI model and PWB API model
- performing authenticated PWB calls
- normalizing PWB error responses
- logging

### PWB is responsible for

- persistence
- domain validation
- canonical property state
- any business rules around publishability, completeness, permissions, or media semantics

---

## Proposed Package Layout

Recommended target structure:

```text
packages/plugins/pwb-properties/
├── package.json
├── tsconfig.json
└── src/
    ├── index.js                  # descriptor
    ├── sandbox-entry.js          # route layer
    ├── admin.jsx                 # React admin entry
    ├── types.js                  # plugin-local runtime-safe constants/types
    ├── settings.js               # settings access + validation
    ├── auth.js                   # PWB auth header construction
    ├── api/
    │   ├── client.js             # plugin-side PWB client wrappers
    │   ├── mappers.js            # UI <-> PWB field mapping
    │   └── errors.js             # normalize PWB errors
    └── admin/
        ├── pages/
        │   ├── PropertiesPage.jsx
        │   ├── PropertyEditPage.jsx
        │   └── SettingsPage.jsx
        ├── components/
        │   ├── PropertyListTable.jsx
        │   ├── PropertyEditForm.jsx
        │   ├── SaveBar.jsx
        │   ├── FieldErrorList.jsx
        │   └── PwbConnectionBanner.jsx
        └── hooks/
            ├── usePropertyEditor.js
            └── usePluginSettings.js
```

The current read-only code in `src/sandbox-entry.js` can remain as the seed for:

- connection handling
- route dispatch
- logging conventions
- list/detail fetches

But the admin UI should no longer be limited to Block Kit once editing is added.

---

## Descriptor Shape

The descriptor should evolve from a standard sandbox-oriented descriptor to a native/trusted
descriptor that includes a React admin entry.

Conceptually:

```js
export function pwbPropertiesPlugin() {
  return {
    id: "pwb-properties",
    version: "0.2.0",
    entrypoint: "pwb-properties",
    adminEntry: "pwb-properties/admin",
    capabilities: ["network:fetch:any"],
    adminPages: [
      { path: "/", label: "Properties", icon: "list" },
      { path: "/settings", label: "Settings", icon: "settings" },
      { path: "/edit", label: "Edit Property", icon: "pencil" }
    ]
  };
}
```

The exact shape should follow the native plugin API the project uses at implementation time.

The important design decision is:

- **React admin pages are first-class**
- **network capability remains required**

---

## Settings Model

The write-capable plugin needs a more explicit settings model than the read-only version.

Use plugin KV for settings.

### Required settings

| Key | Type | Purpose |
|---|---|---|
| `settings:pwbApiUrl` | string | Base URL of the PWB app |
| `settings:authMode` | string enum | How the plugin authenticates to PWB |
| `settings:apiToken` | secret string | Token or API key, depending on auth mode |

### Optional settings

| Key | Type | Purpose |
|---|---|---|
| `settings:propertyWritePath` | string | Override for write endpoint prefix if PWB differs by environment |
| `settings:publicPropertyPathTemplate` | string | Optional public URL template |
| `settings:locale` | string | Default locale, if not fixed to `en` |
| `settings:requestTimeoutMs` | number | Safety timeout for outbound write calls |
| `settings:enableDebugLogging` | boolean | Temporary verbose logging control |

### Suggested enum values for `authMode`

- `bearer_token`
- `basic_auth`
- `session_proxy`
- `none`

For this project, prefer `bearer_token` first.

### Why KV instead of hardcoded env

- easier to change without deploy
- consistent with current plugin pattern
- works per environment/site instance
- keeps the admin self-service

### Settings validation rules

#### `pwbApiUrl`

- must be absolute `http` or `https`
- trim trailing slash before storing
- reject empty string

#### `authMode`

- must be one of the allowed enum values
- default to `bearer_token`

#### `apiToken`

- required when `authMode === "bearer_token"`
- stored as secret-like setting
- never log raw value

---

## Auth Model

The plugin needs two levels of authorization:

1. whether the EmDash user may use the editing feature
2. how the plugin authenticates to PWB

These are separate concerns and should stay separate.

### Layer 1: EmDash user authorization

Only authenticated EmDash users with plugin-management access should be allowed to call
 write routes.

Minimum enforcement:

- private plugin routes only
- rely on EmDash route auth for admin access
- reject unauthenticated or unauthorized users at the plugin route if user context is
  available

If plugin route context exposes the EmDash user, enforce:

- admin only for v1

Later you can relax to:

- admin + editor roles for property editing
- admin only for plugin settings

### Layer 2: PWB authentication

The plugin must authenticate itself to PWB on every write request.

Recommended v1 model:

- create a dedicated PWB API token for the EmDash site
- store that token in plugin settings
- send it as `Authorization: Bearer <token>`

Do not use:

- a shared human admin password
- cookie/session scraping from an embedded PWB UI
- a browser-side direct write from the admin page to PWB

All write requests should flow through the plugin route layer.

### Recommended auth helper behavior

`src/auth.js` should expose something like:

```js
export function buildPwbAuthHeaders(settings) {
  switch (settings.authMode) {
    case "bearer_token":
      return { Authorization: `Bearer ${settings.apiToken}` };
    case "basic_auth":
      return { Authorization: `Basic ${btoa(`${settings.username}:${settings.password}`)}` };
    default:
      return {};
  }
}
```

The route layer merges those headers with:

- `Accept: application/json`
- `Content-Type: application/json` for write requests

### Security rules

- never log token values
- never send secrets back to the browser
- never return the full settings payload from a settings read route
- redact authorization headers in error logs

---

## Route Architecture

The write-capable plugin should expose explicit, narrow routes rather than a single giant
`admin` catch-all.

Use React admin pages for UI, and use plugin API routes for CRUD operations.

Recommended private routes:

| Route | Method | Purpose |
|---|---|---|
| `settings/get` | GET | Return safe settings for the admin UI |
| `settings/save` | POST | Save plugin settings |
| `properties/list` | GET | Return paginated property list |
| `properties/get` | GET | Return one property by slug or id |
| `properties/update` | POST | Update editable fields for a property |
| `properties/create` | POST | Create a new property shell |
| `properties/publish` | POST | Publish a property, if PWB supports separate publish |
| `properties/unpublish` | POST | Unpublish a property |
| `properties/refresh` | POST | Re-fetch canonical property state after save |

Optional later routes:

| Route | Method | Purpose |
|---|---|---|
| `properties/media/upload-url` | POST | Upload helper if PWB supports direct upload |
| `properties/media/attach` | POST | Attach uploaded media to a property |
| `properties/validate` | POST | Dry-run validation without saving |
| `properties/history` | GET | Show last plugin-side save attempts or audit entries |

### Why split routes instead of one `admin` route

- easier to type and test
- clearer logging
- cleaner error handling
- better React UI integration with `usePluginAPI()`
- less hidden branching

The existing `admin` Block Kit route can remain temporarily for read-only browsing during
transition, but the write UI should use explicit data routes.

---

## Detailed Route Contracts

The shapes below are intentionally concrete.

### `GET settings/get`

Purpose:

- provide non-secret settings needed by the admin UI

Response:

```json
{
  "pwbApiUrl": "https://example.com",
  "authMode": "bearer_token",
  "hasApiToken": true,
  "locale": "en",
  "enableDebugLogging": false
}
```

Do not return the raw token.

---

### `POST settings/save`

Purpose:

- validate and persist plugin settings

Request:

```json
{
  "pwbApiUrl": "https://example.com",
  "authMode": "bearer_token",
  "apiToken": "secret-token-value",
  "locale": "en",
  "enableDebugLogging": true
}
```

Response:

```json
{
  "saved": true,
  "hasApiToken": true
}
```

Validation failures should return normalized field errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Settings are invalid",
    "fields": {
      "pwbApiUrl": ["Must be a valid absolute URL"],
      "apiToken": ["API token is required"]
    }
  }
}
```

---

### `GET properties/list`

Purpose:

- populate the property table view

Query params:

- `page`
- `perPage`
- `saleOrRental`
- `q` later, if search is added

Request example:

```text
GET /_emdash/api/plugins/pwb-properties/properties/list?page=1&perPage=20&saleOrRental=sale
```

Response:

```json
{
  "items": [
    {
      "id": 123,
      "slug": "beautiful-villa-marbella",
      "title": "Beautiful Villa Marbella",
      "formatted_price": "€1,250,000",
      "for_sale": true,
      "for_rent": false,
      "count_bedrooms": 4,
      "count_bathrooms": 3,
      "city": "Marbella",
      "region": "Malaga",
      "country_code": "ES"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 201,
    "total_pages": 11
  }
}
```

The plugin should normalize PWB search responses into this admin-focused shape even if the
raw response is different.

---

### `GET properties/get`

Purpose:

- load one canonical property into the edit form

Query params:

- `slug` or `id`

Prefer `slug` in the UI if that is the stable routing key already used by the site.

Response:

```json
{
  "property": {
    "id": 123,
    "slug": "beautiful-villa-marbella",
    "title": "Beautiful Villa Marbella",
    "description": "<p>...</p>",
    "formatted_price": "€1,250,000",
    "for_sale": true,
    "for_rent": false,
    "count_bedrooms": 4,
    "count_bathrooms": 3,
    "address": "Example street",
    "city": "Marbella",
    "region": "Malaga",
    "country_code": "ES",
    "updated_at": "2026-04-05T13:00:00Z"
  }
}
```

The plugin may also return a UI-normalized form model:

```json
{
  "property": { "...canonical..." : "..." },
  "form": {
    "title": "Beautiful Villa Marbella",
    "description": "<p>...</p>",
    "saleOrRental": "sale",
    "price": "1250000",
    "bedrooms": "4",
    "bathrooms": "3",
    "address": "Example street",
    "city": "Marbella",
    "region": "Malaga",
    "countryCode": "ES"
  }
}
```

That is often easier for the form layer.

---

### `POST properties/update`

Purpose:

- persist the first editable property form

Request:

```json
{
  "slug": "beautiful-villa-marbella",
  "changes": {
    "title": "Beautiful Villa Marbella",
    "description": "<p>Updated description</p>",
    "saleOrRental": "sale",
    "price": "1250000",
    "bedrooms": "4",
    "bathrooms": "3",
    "address": "Example street",
    "city": "Marbella",
    "region": "Malaga",
    "countryCode": "ES"
  },
  "expectedUpdatedAt": "2026-04-05T13:00:00Z"
}
```

Response on success:

```json
{
  "saved": true,
  "property": {
    "id": 123,
    "slug": "beautiful-villa-marbella",
    "title": "Beautiful Villa Marbella",
    "updated_at": "2026-04-05T14:05:00Z"
  }
}
```

Response on field validation error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Property update failed validation",
    "fields": {
      "title": ["Title is required"],
      "price": ["Price must be numeric"]
    }
  }
}
```

Response on stale write conflict:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Property was updated elsewhere. Refresh before saving again."
  }
}
```

The plugin should generate these normalized responses even if PWB’s raw error format is
different.

---

### `POST properties/create`

This should not be in the first milestone unless PWB’s creation API is already stable and
documented. If added, it should create only a minimal property shell:

Request:

```json
{
  "title": "New Listing",
  "saleOrRental": "sale"
}
```

Response:

```json
{
  "created": true,
  "property": {
    "id": 456,
    "slug": "new-listing",
    "title": "New Listing"
  }
}
```

---

## PWB Client Layer Inside the Plugin

The plugin should not scatter raw `fetch()` logic through routes.

Create a plugin-side PWB client that wraps:

- URL construction
- auth header construction
- timeout handling
- JSON parsing
- error normalization

Suggested internal API:

```js
export async function pwbListProperties(ctx, settings, params) {}
export async function pwbGetProperty(ctx, settings, slug) {}
export async function pwbUpdateProperty(ctx, settings, payload) {}
export async function pwbCreateProperty(ctx, settings, payload) {}
export async function pwbPublishProperty(ctx, settings, payload) {}
```

The route layer should call these helpers, not raw `ctx.http.fetch()`.

That gives you:

- consistent logging
- one place to attach auth
- one place to transform PWB errors

---

## Data Mapping Strategy

The plugin admin form model should not blindly mirror the raw PWB payload.

Use three distinct models:

1. **PWB canonical model**: whatever PWB returns
2. **Admin form model**: normalized and editor-friendly
3. **Update payload model**: shape expected by the PWB write endpoint

### Example

PWB canonical:

```json
{
  "count_bedrooms": 4,
  "count_bathrooms": 3,
  "for_sale": true,
  "for_rent": false
}
```

Admin form model:

```json
{
  "bedrooms": "4",
  "bathrooms": "3",
  "saleOrRental": "sale"
}
```

PWB update payload:

```json
{
  "count_bedrooms": 4,
  "count_bathrooms": 3,
  "for_sale": true,
  "for_rent": false
}
```

This mapping layer is essential because:

- form controls naturally deal in strings
- UI labels differ from backend keys
- future validation rules will belong in one place

---

## First Editable Form

The first form should be intentionally narrow.

### v1 editable fields

| UI Field | PWB Source | Notes |
|---|---|---|
| `title` | `title` | required |
| `description` | `description` | rich text or HTML string |
| `saleOrRental` | `for_sale` / `for_rent` | UI enum mapped to two booleans |
| `price` | depends on PWB write contract | keep one field in v1 |
| `bedrooms` | `count_bedrooms` | integer |
| `bathrooms` | `count_bathrooms` | integer |
| `address` | `address` | optional |
| `city` | `city` | optional |
| `region` | `region` | optional |
| `countryCode` | `country_code` | optional |

### Fields to exclude from v1

- media gallery
- geolocation
- advanced SEO fields
- internal flags/statuses you have not modeled publicly yet
- multilingual content
- related listings
- features/amenities if they are complex relational data

### Form layout

Recommended sections:

1. **Summary**
   - title
   - sale/rental mode
   - price

2. **Property Details**
   - bedrooms
   - bathrooms

3. **Location**
   - address
   - city
   - region
   - country code

4. **Description**
   - description field

### Save UX

The edit page should show:

- save button
- cancel/reset button
- last-saved timestamp if available
- dirty state warning
- loading spinner during save
- inline field errors
- top-level failure banner for non-field errors

---

## Example React Page Flow

### `PropertyEditPage`

Responsibilities:

- read `slug` from URL query param
- fetch property via `properties/get`
- initialize editable form state
- track `isDirty`
- submit to `properties/update`
- replace local state with canonical response after success

Pseudo flow:

```text
mount
  -> GET properties/get?slug=...
  -> set initial form state

user edits fields
  -> dirty=true

user clicks save
  -> POST properties/update
  -> if success:
       update form baseline
       dirty=false
       show success toast
     if validation error:
       map field errors to inputs
     if conflict:
       show refresh warning
```

### Recommended URL shape

Use:

```text
/_emdash/admin/plugins/pwb-properties/edit?slug=beautiful-villa-marbella
```

That avoids needing dynamic filesystem routes inside the plugin admin entry.

---

## Validation Strategy

Validation should happen in two places.

### Client-side validation

For immediate editor feedback:

- required title
- numeric bedrooms/bathrooms
- valid sale/rental selection
- numeric price format

This should prevent obviously invalid submissions.

### Server-side validation in the plugin

Before calling PWB:

- verify required settings exist
- verify request shape
- normalize and coerce numeric fields
- reject impossible enum values

### Domain validation in PWB

PWB remains the final authority.

The plugin must treat PWB validation errors as canonical and surface them cleanly.

---

## Concurrency and Conflict Handling

A write-capable editor needs a basic strategy for stale data.

Recommended v1 approach:

- include `expectedUpdatedAt` on update requests
- if the currently loaded property timestamp differs from the editor’s base timestamp,
  reject with a conflict

If PWB supports optimistic locking natively, use that.

If not, the plugin can still perform a best-effort preflight:

1. fetch current property
2. compare `updated_at`
3. reject if changed
4. otherwise proceed with update

This is not perfect, but it is better than silent overwrite.

Conflict UX:

- show banner: “This property changed elsewhere. Refresh before saving again.”
- offer reload action

---

## Logging Requirements

The current plugin already uses prefixed logs. The write-capable version should log all of
the following at structured info/warn/error levels.

### Log on every write request

- route name
- property slug or id
- authenticated EmDash user id if available
- whether required settings were present
- outbound PWB endpoint
- response status
- normalized result type: success, validation_error, conflict, upstream_error

### Redaction rules

Never log:

- API token
- raw authorization header
- full property description payload if that is too noisy
- personally sensitive data if listings eventually contain owner/contact information

### Example save logs

```text
pwb-properties: received update request { slug: "villa-1", userId: "..." }
pwb-properties: validated update payload { slug: "villa-1", fields: ["title","price","bedrooms"] }
pwb-properties: calling PWB update endpoint { url: "https://..." }
pwb-properties: PWB update succeeded { slug: "villa-1", status: 200 }
```

---

## Error Normalization

PWB may not return errors in the exact shape your React admin wants.

Create a normalization layer with three output categories:

1. field validation errors
2. top-level business-rule errors
3. upstream/network/system errors

Recommended normalized error schema:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Property update failed validation",
  "fields": {
    "title": ["Title is required"]
  }
}
```

or

```json
{
  "code": "UPSTREAM_ERROR",
  "message": "PWB API request failed"
}
```

The admin page should not parse raw PWB error payloads directly.

---

## Media Strategy

Do not include media editing in the first write milestone unless PWB’s upload API is
already stable and easy to consume.

Why media is hard:

- upload flows often need multipart or presigned URLs
- image ordering and deletion semantics matter
- thumbnail/variant generation can be asynchronous
- error handling is more complex than plain JSON field updates

Recommended plan:

- v1: text and numeric editing only
- v2: add media read visibility in the editor
- v3: add upload/attach/reorder/delete if PWB API makes that practical

---

## Settings Page for the Write-Capable Plugin

The settings page should now include more than just the base URL.

Recommended fields:

- `PWB API URL`
- `Authentication Mode`
- `API Token`
- `Default Locale`
- `Enable Debug Logging`

Settings UX:

- show whether the token is configured without showing its value
- include a “Test Connection” button
- display the result of calling a lightweight authenticated PWB endpoint

### `POST settings/test-connection`

This route is optional but highly recommended.

Response:

```json
{
  "ok": true,
  "message": "Connected successfully"
}
```

Or:

```json
{
  "ok": false,
  "message": "Authentication failed"
}
```

This will save time during setup and avoid debugging property-save failures that are really
connection issues.

---

## Testing Strategy

The write-capable version should have explicit test coverage across three layers.

### 1. Unit tests

For:

- settings validation
- auth header generation
- PWB error normalization
- form model to PWB payload mapping
- route input validation

### 2. Integration tests

For plugin routes:

- `settings/save`
- `settings/test-connection`
- `properties/get`
- `properties/update`

These should mock PWB responses and verify:

- correct outbound path
- correct auth headers
- normalized success/error outputs

### 3. End-to-end admin tests

For:

- opening the edit page
- changing one field
- saving successfully
- seeing a validation error
- seeing a conflict

If automated E2E is too heavy initially, at least document a manual checklist.

---

## Manual Acceptance Checklist

The write-capable plugin should not be considered complete until all of the following pass:

| Check | Expected |
|---|---|
| Settings can save API URL and token | Yes |
| Test connection succeeds with valid auth | Yes |
| Property edit page loads existing property data | Yes |
| Title change saves successfully | Yes |
| Invalid price shows validation error | Yes |
| Save does not leak secrets into logs | Yes |
| PWB write failure shows user-facing error | Yes |
| Stale update produces conflict warning | Yes |
| Reload after save shows canonical updated property | Yes |

---

## Phased Delivery Plan

### Phase 1: Foundation

- add settings for URL, auth mode, token
- add connection test route
- add plugin-side PWB client wrappers
- add error normalization

### Phase 2: First editable form

- add React admin entry
- add `PropertyEditPage`
- implement `properties/get`
- implement `properties/update`
- support the v1 editable field subset

### Phase 3: Editor hardening

- add dirty-state warnings
- add conflict handling
- add better save status feedback
- add structured diagnostics

### Phase 4: Creation workflow

- add `properties/create`
- add post-create redirect to edit page

### Phase 5: Richer CRUD

- publish/unpublish
- media operations
- richer status management

---

## Migration From the Current Read-Only Plugin

The safest migration path is incremental.

### Step 1

Keep the current list and settings pages working.

### Step 2

Add a React admin entry and an edit page without removing the current read-only routes.

### Step 3

Add `Edit` action links from the properties list to the new React page.

### Step 4

Once the React pages are stable, decide whether to retire the old Block Kit detail page or
keep it as a lightweight fallback.

This avoids a big-bang rewrite.

---

## What Not To Do

Do not:

- store editable property data in EmDash content as a mirror
- send browser-side write requests directly to PWB
- rely on user browser sessions against PWB for auth
- start with media uploads before text/numeric editing is stable
- mix raw PWB payloads directly into form components without mapping
- skip conflict handling entirely
- log secrets

---

## Implementation Recommendation

Build the write-capable version as a trusted/native admin plugin that proxies authenticated
write requests to PWB, starting with a single edit form for core listing fields.

That gives you:

- a coherent ownership model
- a good editor UX
- no duplicate listing database
- a path to richer CRUD later without rewriting the public site

If the project continues to treat PWB as the listing backend, this is the right next
architecture.
