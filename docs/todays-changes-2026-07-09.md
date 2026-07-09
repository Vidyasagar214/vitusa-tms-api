# Vitusa TMS Repository Change Report - 2026-07-09

## Scope

- Repository: `Vidyasagar214/vitusa-tms-api`
- Branch analyzed: `cursor/vitusa-tms-changes-analysis-ac9a`
- Commit analyzed: `3583103` (`Initial commit: Vitusa TMS API`)
- Change type: initial repository import; no earlier in-repo baseline exists for a same-day modification diff.
- Files added today: 50 files, 6,785 insertions.

## APIs Added

### Documentation endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/docs` | Swagger UI for the assembled OpenAPI document. |
| GET | `/api/docs.json` | Raw OpenAPI JSON generated from `docs/openapi.yaml`, `docs/paths/*`, and `docs/schemas/*`. |

### Authentication

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Public | Authenticate a user and return a JWT plus user summary. |
| POST | `/api/auth/register` | Admin | Create a user through the auth module. |
| GET | `/api/auth/me` | JWT | Return the current authenticated user. |

### Shipments

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/shipments` | JWT | List shipments with `mode`, `status`, `carrier`, `page`, and `limit` filters. |
| POST | `/api/shipments` | JWT | Create a shipment, generate a `VTS-YYYY-NNNNN` shipment ID, initialize freight cost, milestones, and audit trail. |
| GET | `/api/shipments/{id}` | JWT | Fetch shipment detail by `shipmentId`. |
| PATCH | `/api/shipments/{id}` | JWT | Perform lifecycle actions: `tender`, `accept_tender`, `dispatch`, `in_transit`, `deliver`, or `delay`. |

### Dashboard

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/dashboard` | JWT | Return control-tower KPIs, pipeline status, active loads, and exception feed from shipments. |

### User administration

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/users` | Admin | List all users plus user stats. |
| POST | `/api/users` | Admin | Create an admin/coordinator/finance/carrier user. |
| PATCH | `/api/users/{id}` | Admin | Update name, role, department, carrier portal, status, or password. |
| DELETE | `/api/users/{id}` | Admin | Soft-delete a user by setting `status` to `inactive`. |

### Master data

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/master-data/summary` | JWT | Return active counts for customers, locations, carriers, and commodities. |
| GET | `/api/master-data/customers` | JWT | List active customers. |
| POST | `/api/master-data/customers` | Admin/coordinator | Create a customer. |
| GET | `/api/master-data/locations` | JWT | List active locations, optionally filtered by `type`. |
| POST | `/api/master-data/locations` | Admin/coordinator | Create a location. |
| GET | `/api/master-data/carriers` | JWT | List active carriers. |
| POST | `/api/master-data/carriers` | Admin/coordinator | Create a carrier. |
| GET | `/api/master-data/commodities` | JWT | List active commodities, optionally filtered by `mode`. |
| POST | `/api/master-data/commodities` | Admin/coordinator | Create a commodity. |

### Freight audit / invoices

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/invoices/summary` | JWT | Return approved, on-hold, match-rate, and total invoice stats. |
| GET | `/api/invoices` | JWT | List invoices, optionally filtered by `status`. |
| GET | `/api/invoices/{id}` | JWT | Fetch invoice detail by invoice ID or MongoDB ObjectId. |
| PATCH | `/api/invoices/{id}` | Admin/finance | Approve, reject, hold, or directly set invoice status. |

## APIs Modified

- None detected. Today's history contains the initial repository import only, so every implemented endpoint is an addition relative to an empty baseline.

## Swagger Documentation Updates

Added a split OpenAPI 3.0.3 documentation structure:

- Base spec: `docs/openapi.yaml`
- Path documents:
  - `docs/paths/auth.yaml`
  - `docs/paths/shipments.yaml`
  - `docs/paths/dashboard.yaml`
  - `docs/paths/users.yaml`
  - `docs/paths/master-data.yaml`
  - `docs/paths/invoices.yaml`
- Schema documents:
  - `docs/schemas/error.yaml`
  - `docs/schemas/pagination.yaml`
  - `docs/schemas/user.yaml`
  - `docs/schemas/users-admin.yaml`
  - `docs/schemas/shipment.yaml`
  - `docs/schemas/dashboard.yaml`
  - `docs/schemas/master-data.yaml`
  - `docs/schemas/invoices.yaml`
- Runtime assembly: `src/config/swagger.js`
- Served through Express at `/api/docs` and `/api/docs.json`.

Documentation gaps detected:

1. `DELETE /api/users/{id}` is implemented in `src/routes/userRoutes.js` but is missing from `docs/paths/users.yaml`.
2. `docs/paths/auth.yaml` says `POST /api/auth/register` creates a coordinator-role user, but `src/controllers/authController.js` accepts the request body's `role` value.
3. `docs/ARCHITECTURE.md` describes `accept_tender` as moving a shipment from `Tendered` to `Dispatched`, but the implementation leaves the status as `Tendered`; a separate `dispatch` action is required.

## React Components Changed

- No React component files were changed in this repository.
- The repository is the Express/Mongoose API service. React frontend structure is documented in `docs/ARCHITECTURE.md` as a companion/sibling project, but no frontend source files are present here.

## Database Schema Changes

Added Mongoose models and collections:

| Model | Collection purpose | Notable fields and constraints |
| --- | --- | --- |
| `User` | Identity and RBAC | `email` unique, `role` enum (`admin`, `coordinator`, `finance`, `carrier`), `carrierPortal`, `status`, `lastLogin`, timestamps. |
| `Shipment` | Shipment lifecycle aggregate | `shipmentId` unique, `mode` enum, `status` enum, denormalized customer/carrier/lane strings, `freightCost`, `route`, `carrierInfo`, embedded `milestones`, `bulkRequirements`, `documents`, `auditTrail`, timestamps. |
| `Invoice` | Freight audit queue | `invoiceId` unique, `shipmentId` string reference, expected/submitted amounts, status enum, `holdReason`, embedded `varianceDetail`, timestamps. |
| `Customer` | Customer master data | `name` unique, `code`, `contactEmail`, `status`, timestamps. |
| `Location` | Shipping/receiving locations | `type` enum (`shipper`, `receiver`, `both`), `customerId` ObjectId ref, address fields, `status`, timestamps. |
| `Carrier` | Carrier master data | `name` unique, `scac`, EDI/portal flags, supported modes enum array, `status`, timestamps. |
| `Commodity` | Commodity master data | `name` unique, `mode` enum, `customerId` ObjectId ref, embedded bulk requirements, `status`, timestamps. |

Seed scripts were also added for users, shipments, master data, invoices, and admin creation. The seed scripts are destructive for their target collections because they call `deleteMany` before inserting demo data.

## Bugs Detected

1. **Inactive users can continue using existing JWTs.**
   - `login` blocks inactive accounts, but `protect` only verifies the token and loads the user. It does not check `req.user.status`.
   - Impact: a user deactivated through `DELETE /api/users/{id}` or `PATCH /api/users/{id}` can keep accessing protected APIs until their JWT expires.
   - Files: `src/controllers/authController.js`, `src/middleware/authMiddleware.js`, `src/controllers/userController.js`

2. **Shipment lifecycle docs and implementation disagree.**
   - Architecture docs say `accept_tender` advances `Tendered` to `Dispatched`.
   - The controller's `accept_tender` rule sets `nextStatus: null`, so status remains `Tendered`; `dispatch` is a separate action.
   - Impact: frontend/API consumers may implement the wrong transition sequence.
   - Files: `docs/ARCHITECTURE.md`, `src/controllers/shipmentController.js`

3. **`DELETE /api/users/{id}` is undocumented in Swagger.**
   - The route exists and soft-deactivates a user, but `docs/paths/users.yaml` only documents `GET`, `POST`, and `PATCH`.
   - Impact: generated clients and API consumers will miss the user-deactivation endpoint.
   - Files: `src/routes/userRoutes.js`, `docs/paths/users.yaml`

4. **Login trims passwords before comparison.**
   - User creation hashes the raw password, but login compares `password.trim()`.
   - Impact: valid passwords with leading/trailing spaces cannot authenticate, and password handling is inconsistent.
   - File: `src/controllers/authController.js`

5. **Credential errors reveal whether the email or password failed.**
   - Login returns `Invalid Email` when no user exists and `Invalid Password` for wrong passwords.
   - Impact: attackers can enumerate registered email addresses.
   - File: `src/controllers/authController.js`

6. **Shipment ID generation is not concurrency-safe.**
   - New shipment IDs are generated by reading the latest `shipmentId`, incrementing it in memory, then inserting.
   - Impact: concurrent creates can collide and return 409 even when both requests are valid.
   - File: `src/controllers/shipmentController.js`

7. **Numeric and pagination input validation is incomplete.**
   - `rate`, `page`, and `limit` are converted with `Number(...)` without explicit finite/range checks.
   - Impact: invalid numbers can produce Mongoose cast errors, invalid pagination behavior, or 500 responses instead of 400 validation errors.
   - File: `src/controllers/shipmentController.js`

8. **Admin registration path lacks explicit role validation before persistence.**
   - `POST /api/users` validates roles against `ALLOWED_ROLES`; `POST /api/auth/register` does not and relies on Mongoose validation.
   - Impact: inconsistent error handling and documentation mismatch for user creation.
   - Files: `src/controllers/authController.js`, `src/controllers/userController.js`

## Suggestions for Code Improvements

1. Add a shared validation layer, such as request schemas for body/query/path inputs, and use it across controllers.
2. Reject inactive users in `protect` after loading `User.findById(...)`.
3. Replace shipment ID "read latest and increment" logic with an atomic counter collection or MongoDB transaction-backed sequence.
4. Align shipment lifecycle documentation and OpenAPI descriptions with the implemented state machine, or adjust the implementation if `accept_tender` should advance status.
5. Document `DELETE /api/users/{id}` in OpenAPI and add a contract check that compares Express routes with Swagger paths.
6. Return a single generic invalid-credentials message for login failures.
7. Stop trimming passwords during login; preserve exact submitted password bytes/characters after JSON parsing.
8. Add centralized async error handling to avoid repeated `try/catch` blocks and inconsistent status mapping.
9. Validate required environment variables (`MONGODB_URI`, `JWT_SECRET`) at startup and fail fast with clear messages.
10. Restrict CORS by environment instead of using an unrestricted `cors()` configuration for all deployments.
11. Add automated API tests with an isolated MongoDB test database or in-memory MongoDB:
    - auth success/failure and inactive-user rejection
    - user soft delete
    - shipment lifecycle transitions
    - invoice approve/reject/hold
    - master data create/list flows
12. Consider separating presentation formatting from API domain responses. Several controllers return both raw values and UI-formatted strings, which tightly couples the API to the current frontend display.

## Verification Notes

- Git history and file stats were inspected with `git log` and `git show --stat`.
- Swagger runtime assembly was attempted with Node, but local verification could not complete because dependencies were not installed in the workspace (`Cannot find module 'yamljs'`). `yamljs` is declared in `package.json` and `package-lock.json`, so this appears to be an environment setup state rather than a missing manifest dependency.
- `npm test` was not run because the current test script is a placeholder that exits with `Error: no test specified`.
